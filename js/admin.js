/* =========================================================================
   ARONEX 1.0 — admin dashboard logic (admin.html)
   - Email + password sign-in (Supabase Auth) — no public sign-up
   - Verifies user.app_metadata.role === "admin"
   - Lists registrations, stats, filters, search
   - Marks payments verified / rejected
   - Exports CSV for event-day coordination
   The database independently enforces the same admin-only rule via RLS, so
   hiding this page is NOT the security boundary.
   ========================================================================= */

(function () {
  "use strict";

  var cfg = window.ARONEX_CONFIG || {};
  var event = cfg.event || {};
  var ARONEX = window.ARONEX || {};
  var supabase = ARONEX.client || null;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var currency = event.currency || "\u20B9";
  var fee = Number(event.fee || 200);

  var state = {
    rows: [],
    status: "all",
    competition: "all",
    search: "",
    user: null,
  };

  /* ------------------------------------------------------------------ *
   *  Views                                                             *
   * ------------------------------------------------------------------ */
  function showView(name) {
    var login = $("#login-view");
    var dash = $("#dashboard-view");
    if (login) login.hidden = name !== "login";
    if (dash) dash.hidden = name !== "dashboard";
  }

  function showLoginError(text) {
    var box = $("#login-error");
    if (!box) return;
    box.textContent = text;
    box.hidden = !text;
  }

  function toast(text, isError) {
    var el = $("#toast");
    if (!el) return;
    el.textContent = text;
    el.className = "toast show" + (isError ? " toast-error" : "");
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.className = "toast"; }, 2600);
  }

  function isAdmin(user) {
    return Boolean(user && user.app_metadata && user.app_metadata.role === "admin");
  }

  /* ------------------------------------------------------------------ *
   *  Auth                                                              *
   * ------------------------------------------------------------------ */
  async function init() {
    if (!supabase) {
      showView("login");
      showLoginError("Supabase is not configured yet. Add your project URL and publishable key in js/config.js.");
      var form = $("#login-form");
      if (form) form.querySelector("button[type=submit]").disabled = true;
      return;
    }

    $("#login-form").addEventListener("submit", onLogin);
    $("#logout-btn").addEventListener("click", onLogout);

    var res = await supabase.auth.getSession();
    var session = res.data ? res.data.session : null;
    if (session && session.user) {
      await enter(session.user);
    } else {
      showView("login");
    }

    supabase.auth.onAuthStateChange(function (_evt, s) {
      if (!s) showView("login");
    });
  }

  async function onLogin(e) {
    e.preventDefault();
    showLoginError("");
    var email = $("#login-email").value.trim();
    var password = $("#login-password").value;
    if (!email || !password) { showLoginError("Enter both your email and password."); return; }

    var btn = $("#login-form button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Signing in\u2026";

    var res = await supabase.auth.signInWithPassword({ email: email, password: password });

    btn.disabled = false;
    btn.textContent = "Sign in";

    if (res.error) {
      showLoginError("Sign-in failed. Check your email and password and try again.");
      return;
    }

    var user = res.data.user || (res.data.session && res.data.session.user);
    if (!isAdmin(user)) {
      await supabase.auth.signOut();
      showLoginError("This account is not an administrator. Access denied.");
      return;
    }
    await enter(user);
  }

  async function onLogout() {
    await supabase.auth.signOut();
    state.rows = [];
    state.user = null;
    showView("login");
    var p = $("#login-password");
    if (p) p.value = "";
  }

  async function enter(user) {
    state.user = user;
    var who = $("#admin-email");
    if (who) who.textContent = user.email || "";
    showView("dashboard");
    await loadRows();
  }

  /* ------------------------------------------------------------------ *
   *  Data                                                              *
   * ------------------------------------------------------------------ */
  async function loadRows() {
    var tbody = $("#rows");
    if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="empty">Loading registrations\u2026</td></tr>';

    var res = await supabase
      .from("aronex_registrations")
      .select("*")
      .order("created_at", { ascending: false });

    if (res.error) {
      console.error(res.error);
      if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="empty">Could not load registrations. If this says "permission denied", your account may not have the admin role yet (sign out and back in after running the SQL).</td></tr>';
      toast("Failed to load registrations", true);
      return;
    }
    state.rows = res.data || [];
    renderStats();
    renderTable();
  }

  function applyFilters(rows) {
    var q = state.search.trim().toLowerCase();
    return rows.filter(function (r) {
      if (state.status !== "all" && r.payment_status !== state.status) return false;
      if (state.competition !== "all" && r.competition !== state.competition) return false;
      if (!q) return true;
      var hay = [r.team_leader_name, r.team_leader_email, r.participant2_name, r.participant2_email,
                 r.college_name, r.domain, r.project_title, r.payment_reference, r.team_leader_phone]
        .join(" ").toLowerCase();
      return hay.indexOf(q) !== -1;
    });
  }

  function renderStats() {
    var rows = state.rows;
    var total = rows.length;
    var ideathon = rows.filter(function (r) { return r.competition === "Ideathon"; }).length;
    var poster = rows.filter(function (r) { return r.competition === "Poster Presentation"; }).length;
    var pending = rows.filter(function (r) { return r.payment_status === "pending"; }).length;
    var submitted = rows.filter(function (r) { return r.payment_status === "submitted"; }).length;
    var verified = rows.filter(function (r) { return r.payment_status === "verified"; }).length;
    var rejected = rows.filter(function (r) { return r.payment_status === "rejected"; }).length;
    var collected = verified * fee;

    set("#stat-total", total);
    set("#stat-ideathon", ideathon);
    set("#stat-poster", poster);
    set("#stat-pending", pending + submitted);
    set("#stat-verified", verified);
    set("#stat-rejected", rejected);
    set("#stat-collected", currency + collected);

    function set(sel, v) { var el = $(sel); if (el) el.textContent = v; }
  }

  function statusBadge(s) {
    var label = {
      pending: "Pending", submitted: "Submitted", verified: "Verified", rejected: "Rejected",
    }[s] || s;
    return '<span class="badge badge-' + esc(s) + '">' + esc(label) + "</span>";
  }

  function fmtDate(iso) {
    if (!iso) return "\u2014";
    var d = new Date(iso);
    if (isNaN(d)) return esc(iso);
    return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function renderTable() {
    var tbody = $("#rows");
    if (!tbody) return;
    var rows = applyFilters(state.rows);
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="9" class="empty">No registrations match the current filters.</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(function (r) {
      return "<tr>" +
        "<td class=\"nowrap\">" + fmtDate(r.created_at) + "</td>" +
        "<td>" + esc(r.competition) + "</td>" +
        "<td><strong>" + esc(r.team_leader_name) + "</strong><br><span class=\"muted\">" + esc(r.team_leader_email) + "</span><br><span class=\"muted\">" + esc(r.team_leader_phone) + "</span></td>" +
        "<td><strong>" + esc(r.participant2_name) + "</strong><br><span class=\"muted\">" + esc(r.participant2_email) + "</span><br><span class=\"muted\">" + esc(r.participant2_phone) + "</span></td>" +
        "<td>" + esc(r.college_name) + "<br><span class=\"muted\">" + esc(r.course) + " \u00B7 " + esc(r.academic_year) + "</span></td>" +
        "<td>" + esc(r.domain) + (r.project_title ? "<br><span class=\"muted\">" + esc(r.project_title) + "</span>" : "") + "</td>" +
        "<td class=\"nowrap\">" + esc(r.payment_reference || "\u2014") + "</td>" +
        "<td>" + statusBadge(r.payment_status) + "</td>" +
        "<td class=\"nowrap actions\">" +
          '<button class="btn btn-mini btn-ok" data-act="verified" data-id="' + esc(r.id) + '">Verify</button>' +
          '<button class="btn btn-mini btn-warn" data-act="submitted" data-id="' + esc(r.id) + '">Submitted</button>' +
          '<button class="btn btn-mini btn-danger" data-act="rejected" data-id="' + esc(r.id) + '">Reject</button>' +
          '<button class="btn btn-mini" data-detail="' + esc(r.id) + '">Details</button>' +
        "</td>" +
      "</tr>";
    }).join("");
  }

  async function setStatus(id, status) {
    var res = await supabase.from("aronex_registrations").update({ payment_status: status }).eq("id", id);
    if (res.error) {
      console.error(res.error);
      toast("Update failed: " + (res.error.message || "unknown error"), true);
      return;
    }
    var row = state.rows.find(function (r) { return r.id === id; });
    if (row) row.payment_status = status;
    renderStats();
    renderTable();
    toast("Marked as " + status + ".");
  }

  function openDetails(id) {
    var r = state.rows.find(function (x) { return x.id === id; });
    if (!r) return;
    var fields = [
      ["Submitted", fmtDate(r.created_at)],
      ["Competition", r.competition],
      ["Domain / theme", r.domain],
      ["Project title", r.project_title || "\u2014"],
      ["Team leader", r.team_leader_name],
      ["Leader email", r.team_leader_email],
      ["Leader phone", r.team_leader_phone],
      ["Participant 2", r.participant2_name],
      ["Participant 2 email", r.participant2_email],
      ["Participant 2 phone", r.participant2_phone],
      ["College", r.college_name],
      ["Course", r.course],
      ["Academic year", r.academic_year],
      ["Fee", currency + (r.registration_fee != null ? r.registration_fee : fee)],
      ["Payment reference", r.payment_reference || "\u2014"],
      ["Payment status", r.payment_status],
    ];
    var html = fields.map(function (f) {
      return '<div class="detail-row"><span>' + esc(f[0]) + "</span><strong>" + esc(f[1]) + "</strong></div>";
    }).join("");
    $("#detail-body").innerHTML = html;
    $("#detail-modal").hidden = false;
  }

  function exportCsv() {
    var rows = applyFilters(state.rows);
    if (!rows.length) { toast("Nothing to export for the current filters.", true); return; }
    var cols = [
      "created_at", "competition", "domain", "team_leader_name", "team_leader_email", "team_leader_phone",
      "participant2_name", "participant2_email", "participant2_phone", "college_name", "course",
      "academic_year", "project_title", "registration_fee", "payment_reference", "payment_status",
    ];
    var escCell = function (v) {
      if (v == null) return "";
      var s = String(v);
      if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    var lines = [cols.join(",")];
    rows.forEach(function (r) {
      lines.push(cols.map(function (c) { return escCell(r[c]); }).join(","));
    });
    var blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    var stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = "aronex-registrations-" + stamp + ".csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast("Exported " + rows.length + " row(s) to CSV.");
  }

  /* ------------------------------------------------------------------ *
   *  Wiring                                                            *
   * ------------------------------------------------------------------ */
  function bind() {
    var refresh = $("#refresh-btn");
    if (refresh) refresh.addEventListener("click", loadRows);

    var exportBtn = $("#export-btn");
    if (exportBtn) exportBtn.addEventListener("click", exportCsv);

    var status = $("#filter-status");
    if (status) status.addEventListener("change", function () { state.status = status.value; renderTable(); });

    var comp = $("#filter-competition");
    if (comp) comp.addEventListener("change", function () { state.competition = comp.value; renderTable(); });

    var search = $("#filter-search");
    if (search) search.addEventListener("input", function () { state.search = search.value; renderTable(); });

    var tbody = $("#rows");
    if (tbody) {
      tbody.addEventListener("click", function (e) {
        var act = e.target.closest("[data-act]");
        if (act) { setStatus(act.getAttribute("data-id"), act.getAttribute("data-act")); return; }
        var det = e.target.closest("[data-detail]");
        if (det) openDetails(det.getAttribute("data-detail"));
      });
    }

    var close = $("#detail-close");
    if (close) close.addEventListener("click", function () { $("#detail-modal").hidden = true; });
    var modal = $("#detail-modal");
    if (modal) modal.addEventListener("click", function (e) { if (e.target === modal) modal.hidden = true; });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && modal) modal.hidden = true; });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var year = $("#year");
    if (year) year.textContent = new Date().getFullYear();
    bind();
    init();
  });
})();
