/* =========================================================================
   ARONEX 1.0 — Supabase client bootstrap
   Creates a single shared client (window.ARONEX.client) from the public
   values in config.js. If the placeholders have not been replaced yet,
   client stays null so the pages can show a friendly "not configured" note
   instead of throwing errors.
   ========================================================================= */

(function () {
  "use strict";

  var cfg = window.ARONEX_CONFIG || {};
  var url = String(cfg.supabaseUrl || "").trim();
  var key = String(cfg.supabaseKey || "").trim();

  var looksConfigured =
    /^https?:\/\//i.test(url) &&
    url.indexOf("YOUR-PROJECT") === -1 &&
    key.length > 0 &&
    key.indexOf("REPLACE_ME") === -1;

  window.ARONEX = window.ARONEX || {};
  window.ARONEX.isConfigured = looksConfigured;

  if (looksConfigured && window.supabase && typeof window.supabase.createClient === "function") {
    window.ARONEX.client = window.supabase.createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: "aronex-auth",
      },
    });
  } else {
    window.ARONEX.client = null;
  }
})();
