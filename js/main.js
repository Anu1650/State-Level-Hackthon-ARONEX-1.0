/* =========================================================================
   ARONEX 1.0 — landing page logic (index.html)
   - Fills event/organiser text from config.js
   - Countdown to the event
   - Renders competitions, form options, UPI payment + QR
   - Validates and submits registrations to Supabase
   ========================================================================= */

(function () {
  "use strict";

  var cfg = window.ARONEX_CONFIG || {};
  var event = cfg.event || {};
  var organizer = cfg.organizer || {};
  var competitions = Array.isArray(cfg.competitions) ? cfg.competitions : [];
  var domains = Array.isArray(cfg.domains) ? cfg.domains : [];
  var academicYears = Array.isArray(cfg.academicYears) ? cfg.academicYears : [];
  var registration = cfg.registration || {};
  var MODE = registration.mode === "form" ? "form" : "unstop";

  var ARONEX = window.ARONEX || {};
  var supabase = ARONEX.client || null;

  function isUnstopMode() { return MODE === "unstop"; }
  function unstopUrl() { return String(registration.unstopUrl || "").trim(); }

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var currency = event.currency || "\u20B9";
  var fee = Number(event.fee || 200);

  function getPath(obj, path) {
    return path.split(".").reduce(function (o, k) { return o == null ? o : o[k]; }, obj);
  }

  /* ------------------------------------------------------------------ *
   *  Apply configuration to static text                                *
   * ------------------------------------------------------------------ */
  function applyConfig() {
    $$("[data-cfg]").forEach(function (el) {
      var v = getPath(cfg, el.getAttribute("data-cfg"));
      if (v != null && v !== "") el.textContent = v;
    });
    $$("[data-cfg-href]").forEach(function (el) {
      var v = getPath(cfg, el.getAttribute("data-cfg-href"));
      if (v) el.setAttribute("href", v);
    });
    $$("[data-fee]").forEach(function (el) { el.textContent = currency + fee; });
    if (event.name) {
      var tail = event.theme || event.tagline || "";
      document.title = event.name + (tail ? " \u2014 " + tail : "");
    }
  }

  /* ------------------------------------------------------------------ *
   *  Countdown                                                         *
   * ------------------------------------------------------------------ */
  function initCountdown() {
    var root = $("#countdown");
    if (!root) return;
    var target = Date.parse(event.startDate);
    if (isNaN(target)) { root.hidden = true; return; }

    var d = $("#cd-days"), h = $("#cd-hours"), m = $("#cd-mins"), s = $("#cd-secs");
    var label = $("#countdown-label");

    function pad(n) { return String(n).padStart(2, "0"); }

    function tick() {
      var diff = target - Date.now();
      if (diff <= 0) {
        if (label) label.textContent = "The event has begun!";
        d.textContent = h.textContent = m.textContent = s.textContent = "00";
        clearInterval(timer);
        return;
      }
      var sec = Math.floor(diff / 1000);
      d.textContent = pad(Math.floor(sec / 86400));
      h.textContent = pad(Math.floor((sec % 86400) / 3600));
      m.textContent = pad(Math.floor((sec % 3600) / 60));
      s.textContent = pad(sec % 60);
    }
    var timer = setInterval(tick, 1000);
    tick();
  }

  /* ------------------------------------------------------------------ *
   *  Navigation                                                        *
   * ------------------------------------------------------------------ */
  function initNav() {
    var toggle = $("#nav-toggle");
    var menu = $("#nav-menu");
    if (toggle && menu) {
      toggle.addEventListener("click", function () {
        var open = menu.classList.toggle("open");
        toggle.setAttribute("aria-expanded", String(open));
      });
      $$("a", menu).forEach(function (a) {
        a.addEventListener("click", function () {
          menu.classList.remove("open");
          toggle.setAttribute("aria-expanded", "false");
        });
      });
    }
    var year = $("#year");
    if (year) year.textContent = new Date().getFullYear();
  }

  /* ------------------------------------------------------------------ *
   *  Competitions                                                      *
   * ------------------------------------------------------------------ */
  function renderCompetitions() {
    var grid = $("#competitions-grid");
    if (!grid || !competitions.length) return;
    grid.innerHTML = competitions.map(function (c) {
      var points = (c.points || []).map(function (p) {
        return '<li><span class="tick">\u2713</span>' + esc(p) + "</li>";
      }).join("");

      var cta;
      if (isUnstopMode()) {
        var u = unstopUrl();
        cta = u
          ? '<a class="btn btn-ghost comp-cta" href="' + esc(u) + '" target="_blank" rel="noopener">Register on Unstop</a>'
          : '<a class="btn btn-ghost comp-cta" href="#register">Register for ' + esc(c.title || c.key) + "</a>";
      } else {
        cta = '<button class="btn btn-ghost comp-cta" type="button" data-comp="' + esc(c.key) + '">Register for ' + esc(c.title || c.key) + "</button>";
      }

      return (
        '<article class="comp-card reveal">' +
          '<div class="comp-icon" aria-hidden="true">' + esc(c.icon || "\u2728") + "</div>" +
          '<h3 class="comp-title">' + esc(c.title || c.key) + "</h3>" +
          '<p class="comp-tagline">' + esc(c.tagline || "") + "</p>" +
          '<p class="comp-desc">' + esc(c.description || "") + "</p>" +
          (points ? '<ul class="comp-points">' + points + "</ul>" : "") +
          cta +
        "</article>"
      );
    }).join("");

    grid.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-comp]");
      if (!btn) return;
      var select = $("#competition");
      if (select) select.value = btn.getAttribute("data-comp");
      scrollToForm();
    });
  }

  function scrollToForm() {
    var el = $("#register");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    var first = $("#teamLeaderName");
    if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 600);
  }

  /* ------------------------------------------------------------------ *
   *  Form options                                                      *
   * ------------------------------------------------------------------ */
  function renderFormOptions() {
    var comp = $("#competition");
    if (comp) {
      comp.innerHTML = '<option value="">Select a competition\u2026</option>' +
        competitions.map(function (c) {
          return '<option value="' + esc(c.key) + '">' + esc(c.title || c.key) + "</option>";
        }).join("");
    }
    var list = $("#domain-list");
    if (list) {
      list.innerHTML = domains.map(function (d) { return "<option value=\"" + esc(d) + "\"></option>"; }).join("");
    }
    var years = $("#academicYear");
    if (years) {
      years.innerHTML = '<option value="">Select year\u2026</option>' +
        academicYears.map(function (y) { return '<option value="' + esc(y) + '">' + esc(y) + "</option>"; }).join("");
    }
  }

  /* ------------------------------------------------------------------ *
   *  Payment (UPI + QR)                                                *
   * ------------------------------------------------------------------ */
  function upiLink() {
    if (organizer.upiLink) return organizer.upiLink;
    if (!organizer.upiId) return "";
    var params = [
      "pa=" + encodeURIComponent(organizer.upiId),
      "pn=" + encodeURIComponent(organizer.upiPayeeName || event.name || "ARONEX"),
      "am=" + encodeURIComponent(String(fee)),
      "cu=INR",
      "tn=" + encodeURIComponent((event.name || "ARONEX") + " Registration Fee"),
    ];
    return "upi://pay?" + params.join("&");
  }

  function isUpiConfigured() {
    return Boolean(organizer.upiId || organizer.upiLink || organizer.qrImage);
  }

  function renderPayment() {
    var box = $("#payment-box");
    if (!box) return;

    /* Unstop-first mode: the fee is collected on Unstop, not here. */
    if (isUnstopMode()) {
      var u = unstopUrl();
      var payee = organizer.upiPayeeName || "";
      var h = "";
      h += '<div class="pay-grid">';
      h += '<div class="pay-details">';
      h += '<p class="pay-amount"><span>' + currency + fee + "</span> <span class=\"pay-per\">per team (" + Number(event.teamSize || 2) + " participants)</span></p>";
      h += '<ul class="pay-list">';
      h += "<li><span>Covers</span><strong>Both team members</strong></li>";
      h += "<li><span>Platform</span><strong>Unstop</strong></li>";
      h += "<li><span>Payment</span><strong>Secure online</strong></li>";
      h += "</ul>";
      h += u
        ? '<a class="btn btn-primary" href="' + esc(u) + '" target="_blank" rel="noopener">Register &amp; pay on Unstop</a>'
        : '<a class="btn btn-primary" href="#register">See registration details</a>';
      h += '<p class="pay-hint">You complete the payment inside your Unstop registration. Keep the receipt Unstop provides.</p>';
      if (registration.note) h += '<p class="pay-hint">' + esc(registration.note) + "</p>";
      h += "</div>";
      h += '<div class="pay-qr"><div class="pay-badge" aria-hidden="true">\uD83C\uDF9F\uFE0F</div><p class="qr-caption">Official registration on Unstop</p></div>';
      h += "</div>";
      box.innerHTML = h;
      return;
    }

    if (!isUpiConfigured()) {
      box.innerHTML =
        '<div class="notice notice-info">' +
          "<strong>Payment details are being finalised.</strong>" +
          "<p>Please contact the organisers for the official UPI ID before paying. " +
          "Do not send money to any other account.</p>" +
        "</div>";
      return;
    }

    var link = upiLink();
    var html = "";
    var payee = organizer.upiPayeeName || organizer.upiId;
    html += '<div class="pay-grid">';
    html += '<div class="pay-details">';
    html += '<p class="pay-amount"><span data-fee>' + currency + fee + "</span> <span class=\"pay-per\">per team (" + Number(event.teamSize || 2) + " participants)</span></p>";
    html += "<ul class=\"pay-list\">";
    html += "<li><span>UPI ID</span><strong class=\"copyable\" data-copy=\"" + esc(organizer.upiId || "") + "\">" + esc(organizer.upiId || "\u2014") + "</strong></li>";
    if (payee) html += "<li><span>Pay to</span><strong>" + esc(payee) + "</strong></li>";
    html += "<li><span>Amount</span><strong>" + currency + fee + "</strong></li>";
    html += "<li><span>Note / remark</span><strong>" + esc((event.name || "ARONEX") + " Reg Fee") + "</strong></li>";
    html += "</ul>";
    if (link) {
      html += '<a class="btn btn-primary" href="' + esc(link) + '">Open UPI app to pay ' + currency + fee + "</a>";
    }
    html += '<p class="pay-hint">After paying, copy the <strong>UTR / transaction reference</strong> from your UPI app and paste it in the registration form below.</p>';
    if (organizer.extraNote) html += '<p class="pay-hint">' + esc(organizer.extraNote) + "</p>";
    html += "</div>";

    html += '<div class="pay-qr">';
    if (organizer.qrImage) {
      html += '<img class="qr-img" src="' + esc(organizer.qrImage) + '" alt="UPI QR code for ARONEX registration fee" />';
    } else if (link) {
      html += '<canvas id="upi-qr" width="220" height="220" aria-label="UPI QR code"></canvas>';
    }
    html += '<p class="qr-caption">Scan with any UPI app</p>';
    html += "</div>";
    html += "</div>";

    box.innerHTML = html;

    // Draw a QR code locally (no third-party service, no data leaves the page)
    var canvas = $("#upi-qr");
    if (canvas && link && window.QRCode && typeof window.QRCode.toCanvas === "function") {
      window.QRCode.toCanvas(canvas, link, { width: 220, margin: 1, color: { dark: "#0b0b16", light: "#ffffff" } }, function (err) {
        if (err) canvas.replaceWith(document.createTextNode(""));
      });
    } else if (canvas) {
      var wrap = canvas.parentElement;
      if (wrap) wrap.hidden = true;
    }

    // Click-to-copy UPI ID
    $$(".copyable", box).forEach(function (el) {
      el.addEventListener("click", function () {
        var text = el.getAttribute("data-copy");
        if (!text) return;
        navigator.clipboard && navigator.clipboard.writeText(text).then(function () {
          var old = el.textContent;
          el.textContent = "Copied!";
          setTimeout(function () { el.textContent = old; }, 1200);
        });
      });
    });
  }

  /* ------------------------------------------------------------------ *
   *  Contact + footer                                                  *
   * ------------------------------------------------------------------ */
  function renderContact() {
    var section = $("#contact");
    if (!section) return;
    var items = [];
    if (organizer.name) items.push('<li><span class="ci">\uD83C\uDFDB\uFE0F</span><div><strong>Organised by</strong><br>' + esc(organizer.name) + "</div></li>");

    function telHref(p) { return "tel:" + String(p).replace(/[^\d+]/g, ""); }

    (Array.isArray(organizer.contacts) ? organizer.contacts : []).forEach(function (c) {
      if (!c) return;
      var lines = [];
      if (c.name) lines.push(esc(c.name));
      if (c.phone) lines.push('<a href="' + esc(telHref(c.phone)) + '">' + esc(c.phone) + "</a>");
      if (c.email) lines.push('<a href="mailto:' + esc(c.email) + '">' + esc(c.email) + "</a>");
      if (!lines.length) return;
      items.push('<li><span class="ci">\uD83D\uDC64</span><div><strong>' + esc(c.role || "Contact") + "</strong><br>" + lines.join("<br>") + "</div></li>");
    });

    if (organizer.contactEmail) items.push('<li><span class="ci">\u2709\uFE0F</span><div><strong>Email</strong><br><a href="mailto:' + esc(organizer.contactEmail) + '">' + esc(organizer.contactEmail) + "</a></div></li>");
    if (organizer.contactPhone) items.push('<li><span class="ci">\u260E\uFE0F</span><div><strong>Phone</strong><br><a href="' + esc(telHref(organizer.contactPhone)) + '">' + esc(organizer.contactPhone) + "</a></div></li>");

    if (!items.length) {
      section.hidden = true;
      return;
    }
    section.hidden = false;
    var list = $("#contact-list");
    if (list) list.innerHTML = items.join("");
  }

  function renderAltForms() {
    var wrap = $("#alt-forms");
    var list = $("#alt-forms-list");
    if (!wrap || !list) return;
    var forms = (Array.isArray(registration.forms) ? registration.forms : []).filter(function (f) {
      return f && f.url;
    });
    if (!forms.length) { wrap.hidden = true; return; }
    wrap.hidden = false;
    list.innerHTML = forms.map(function (f) {
      return '<a class="btn btn-ghost" href="' + esc(f.url) + '" target="_blank" rel="noopener">' + esc(f.label || "Registration form") + "</a>";
    }).join("");
  }

  function renderRulebook() {
    var url = String(registration.rulebookUrl || "").trim();
    $$("[data-rulebook]").forEach(function (a) {
      if (url) { a.setAttribute("href", url); a.hidden = false; } else { a.hidden = true; }
    });
    var row = $("#rulebook-row");
    var link = $("#rulebook-link");
    if (row && link) {
      if (url) { link.setAttribute("href", url); row.hidden = false; } else { row.hidden = true; }
    }
  }

  /* ------------------------------------------------------------------ *
   *  Registration mode (Unstop vs built-in form)                       *
   * ------------------------------------------------------------------ */
  function applyRegistrationMode() {
    var unstopBlock = $("#unstop-register");
    var builtin = $("#builtin-register");
    var adminLink = $("#admin-link");
    var paymentLead = $("#payment-lead");

    if (isUnstopMode()) {
      if (unstopBlock) unstopBlock.hidden = false;
      if (builtin) builtin.hidden = true;
      if (adminLink) adminLink.hidden = true;

      var u = unstopUrl();
      var cta = $("#unstop-cta");
      var fallback = $("#unstop-fallback");
      var note = $("#unstop-note");
      if (cta) {
        if (u) cta.href = u; else cta.hidden = true;
      }
      if (fallback) fallback.hidden = Boolean(u);
      if (note && registration.note) { note.textContent = registration.note; note.hidden = false; }
      renderAltForms();
    } else {
      if (unstopBlock) unstopBlock.hidden = true;
      if (builtin) builtin.hidden = false;
      if (adminLink) adminLink.hidden = false;
      var alt = $("#alt-forms");
      if (alt) alt.hidden = true;
      if (paymentLead) {
        paymentLead.innerHTML = "<strong>" + currency + fee + "</strong> per team for the entire event. Complete the UPI payment and submit the transaction reference with your registration.";
      }
    }

    renderRulebook();
  }

  /* ------------------------------------------------------------------ *
   *  Registration form                                                 *
   * ------------------------------------------------------------------ */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function isPhone(v) {
    var digits = String(v || "").replace(/\D/g, "");
    var ten = digits.length > 10 ? digits.slice(-10) : digits;
    return /^[6-9]\d{9}$/.test(ten);
  }
  function isEmail(v) { return EMAIL_RE.test(String(v || "").trim()); }

  function readForm(form) {
    var el = form.elements;
    return {
      competition: el.competition ? el.competition.value : "",
      domain: el.domain ? el.domain.value : "",
      teamLeaderName: el.teamLeaderName ? el.teamLeaderName.value : "",
      teamLeaderPhone: el.teamLeaderPhone ? el.teamLeaderPhone.value : "",
      teamLeaderEmail: el.teamLeaderEmail ? el.teamLeaderEmail.value : "",
      participant2Name: el.participant2Name ? el.participant2Name.value : "",
      participant2Phone: el.participant2Phone ? el.participant2Phone.value : "",
      participant2Email: el.participant2Email ? el.participant2Email.value : "",
      collegeName: el.collegeName ? el.collegeName.value : "",
      course: el.course ? el.course.value : "",
      academicYear: el.academicYear ? el.academicYear.value : "",
      projectTitle: el.projectTitle ? el.projectTitle.value : "",
      paymentReference: el.paymentReference ? el.paymentReference.value : "",
      declaration: el.declaration ? el.declaration.checked : false,
      honeypot: el.website ? el.website.value : "",
    };
  }

  function referenceRequired() { return isUpiConfigured(); }

  function validate(d) {
    var errs = [];
    var validKeys = competitions.map(function (c) { return c.key; });
    if (!d.competition || validKeys.indexOf(d.competition) === -1) errs.push("Please choose a valid competition.");
    if (d.domain.trim().length < 2) errs.push("Please enter your domain / theme.");
    if (d.teamLeaderName.trim().length < 2) errs.push("Team leader name looks too short.");
    if (!isEmail(d.teamLeaderEmail)) errs.push("Team leader email is not valid.");
    if (!isPhone(d.teamLeaderPhone)) errs.push("Team leader phone must be a valid 10-digit mobile number.");
    if (d.participant2Name.trim().length < 2) errs.push("Participant 2 name looks too short.");
    if (!isEmail(d.participant2Email)) errs.push("Participant 2 email is not valid.");
    if (!isPhone(d.participant2Phone)) errs.push("Participant 2 phone must be a valid 10-digit mobile number.");
    if (isEmail(d.teamLeaderEmail) && isEmail(d.participant2Email) &&
        d.teamLeaderEmail.trim().toLowerCase() === d.participant2Email.trim().toLowerCase()) {
      errs.push("Team leader and Participant 2 must use different email addresses.");
    }
    if (d.collegeName.trim().length < 2) errs.push("Please enter your college name.");
    if (d.course.trim().length < 1) errs.push("Please enter your course.");
    if (!d.academicYear) errs.push("Please select your academic year.");
    if (referenceRequired() && d.paymentReference.trim().length < 6) {
      errs.push("Please enter the UPI transaction reference (UTR) from your payment.");
    }
    if (!d.declaration) errs.push("Please tick the declaration before submitting.");
    return errs;
  }

  function showMessage(type, text) {
    var box = $("#form-messages");
    if (!box) return;
    box.className = "form-messages " + type;
    box.innerHTML = esc(text);
    box.hidden = false;
    box.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  function clearMessage() {
    var box = $("#form-messages");
    if (box) { box.hidden = true; box.textContent = ""; }
  }
  function setLoading(on) {
    var btn = $("#submit-btn");
    if (!btn) return;
    btn.disabled = on;
    btn.dataset.label = btn.dataset.label || btn.textContent;
    btn.textContent = on ? "Submitting\u2026" : btn.dataset.label;
  }

  async function onSubmit(e) {
    e.preventDefault();
    clearMessage();
    var form = e.currentTarget;
    var d = readForm(form);

    // Honeypot: real users never fill the hidden "website" field.
    if (d.honeypot) { showSuccess(d.paymentReference, form); return; }

    var errs = validate(d);
    if (errs.length) { showMessage("error", errs[0]); return; }

    if (!supabase) {
      showMessage("error", "Online registration is not switched on yet. Please contact the organisers to register.");
      return;
    }

    setLoading(true);
    var payload = {
      competition: d.competition,
      domain: d.domain.trim(),
      team_leader_name: d.teamLeaderName.trim(),
      team_leader_phone: d.teamLeaderPhone.trim(),
      team_leader_email: d.teamLeaderEmail.trim().toLowerCase(),
      participant2_name: d.participant2Name.trim(),
      participant2_phone: d.participant2Phone.trim(),
      participant2_email: d.participant2Email.trim().toLowerCase(),
      college_name: d.collegeName.trim(),
      course: d.course.trim(),
      academic_year: d.academicYear,
      project_title: d.projectTitle.trim() || null,
      payment_reference: d.paymentReference.trim() || null,
      registration_fee: fee,
    };

    // NOTE: no .select() here. The public (anon) role may only INSERT,
    // not read. We show a generic confirmation instead of returning data.
    var res = await supabase.from("aronex_registrations").insert(payload);
    setLoading(false);

    if (res.error) {
      console.error("Registration failed:", res.error);
      var msg = "We could not submit your registration. Please try again in a moment.";
      if (res.error.code === "23505") msg = "One of these email addresses has already been registered. If this is a mistake, contact the organisers.";
      else if (res.error.code === "23514") msg = "Some details were rejected. Please double-check every field and try again.";
      else if (res.error.code === "42501" || /permission|policy/i.test(res.error.message || "")) {
        msg = "Registration is temporarily unavailable. Please contact the organisers.";
      }
      showMessage("error", msg);
      return;
    }

    showSuccess(d.paymentReference, form);
  }

  function showSuccess(reference, form) {
    if (form) form.reset();
    var panel = $("#registration-success");
    var refEl = $("#success-ref");
    if (refEl) refEl.textContent = (reference && reference.trim()) || "\u2014";
    if (panel) {
      panel.hidden = false;
      panel.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    clearMessage();
  }

  function initForm() {
    var form = $("#registration-form");
    if (!form) return;

    var banner = $("#form-config-warning");
    if (banner && !supabase) banner.hidden = false;

    // Only require the UTR when UPI details are configured.
    if (!referenceRequired()) {
      var star = $("#utr-req");
      if (star) star.hidden = true;
      var utr = $("#paymentReference");
      if (utr) {
        utr.placeholder = "Optional \u2014 paste your UTR if you have already paid";
      }
    }

    form.addEventListener("submit", onSubmit);

    var reset = $("#success-reset");
    if (reset) {
      reset.addEventListener("click", function () {
        var panel = $("#registration-success");
        if (panel) panel.hidden = true;
        scrollToForm();
      });
    }
  }

  /* ------------------------------------------------------------------ *
   *  Scroll reveal                                                     *
   * ------------------------------------------------------------------ */
  function initReveal() {
    var els = $$(".reveal");
    if (!els.length) return;
    if (!("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------------------------------------------ *
   *  Boot                                                              *
   * ------------------------------------------------------------------ */
  document.addEventListener("DOMContentLoaded", function () {
    applyConfig();
    initNav();
    initCountdown();
    renderCompetitions();
    renderFormOptions();
    applyRegistrationMode();
    renderPayment();
    renderContact();
    initForm();
    initReveal();
  });
})();
