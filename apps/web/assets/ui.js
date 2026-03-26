/* apps/web/assets/ui.js
   MUON NOI — UI Controller (No hash, no router)
   - Mobile drawer stable (no stuck)
   - Theme dark/light saved
   - Language VI/EN saved (UI label only for now)
   - No tracking, no libs
*/

(() => {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const IS_SECURE = location.protocol === "https:";

  function safeSetAttr(el, k, v){ if (el) el.setAttribute(k, v); }
  function safeText(el, v){ if (el) el.textContent = String(v ?? ""); }

  const KEY_THEME = "mn_theme";
  const KEY_LANG  = "mn_lang";

  // Elements expected from apps/web/index.html
  const burger = $("#mnBurger");
  const mobile = $("#mnMobile");
  const themeBtn = $("#themeBtn");
  const langBtn = $("#langBtn");

  function getStored(k){
    try { return localStorage.getItem(k); } catch { return null; }
  }
  function setStored(k,v){
    try { localStorage.setItem(k, v); } catch {}
  }

  function detectTheme(){
    const saved = getStored(KEY_THEME);
    if (saved === "dark" || saved === "light") return saved;
    // Default dark (your system tone)
    return "dark";
  }

  function applyTheme(t){
    const theme = (t === "light") ? "light" : "dark";
    safeSetAttr(document.documentElement, "data-theme", theme);
    setStored(KEY_THEME, theme);
    // Button icon (simple)
    safeText(themeBtn, theme === "dark" ? "◐" : "◑");
    // Meta theme-color
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", theme === "dark" ? "#0b0f0c" : "#eef2f6");
  }

  function toggleTheme(){
    const cur = document.documentElement.getAttribute("data-theme") || "dark";
    applyTheme(cur === "dark" ? "light" : "dark");
  }

  function detectLang(){
    const saved = getStored(KEY_LANG);
    if (saved === "vi" || saved === "en") return saved;
    const nav = (navigator.language || "en").toLowerCase();
    return nav.startsWith("vi") ? "vi" : "en";
  }

  function applyLang(l){
    const lang = (l === "vi") ? "vi" : "en";
    setStored(KEY_LANG, lang);
    document.documentElement.lang = lang;
    // UI label only (strings are currently VI in HTML; you can i18n later)
    safeText(langBtn, lang.toUpperCase());

    // If a page provides bilingual blocks, toggle them by `data-lang`.
    // This is safe for pages that don't use `data-lang`.
    try {
      document.querySelectorAll("[data-lang]").forEach((el) => {
        const d = el.getAttribute("data-lang");
        el.hidden = d !== lang;
      });
    } catch {}

    // Notify pages that render dynamic bilingual blocks.
    try {
      window.dispatchEvent(new CustomEvent("mn_lang_changed", { detail: { lang } }));
    } catch {}
  }

  // Overlay: one node to prevent “kẹt”
  let overlay = null;
  function ensureOverlay(){
    if (overlay && overlay.isConnected) return overlay;
    overlay = document.createElement("div");
    overlay.className = "overlay";
    overlay.style.zIndex = "1500";
    overlay.style.display = "none";
    overlay.addEventListener("click", closeMobile);
    document.body.appendChild(overlay);
    return overlay;
  }

  function openMobile(){
    if (!mobile) return;
    ensureOverlay().style.display = "block";
    mobile.hidden = false;
    document.documentElement.style.overflow = "hidden";
  }

  function closeMobile(){
    if (!mobile) return;
    if (overlay) overlay.style.display = "none";
    mobile.hidden = true;
    document.documentElement.style.overflow = "";
  }

  function toggleMobile(){
    if (!mobile) return;
    if (mobile.hidden) openMobile();
    else closeMobile();
  }

  // Toast (optional)
  function toast(msg){
    const t = document.createElement("div");
    t.className = "mn-toast";
    t.textContent = String(msg || "");
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add("is-on"));
    setTimeout(() => t.classList.remove("is-on"), 2400);
    setTimeout(() => { try{t.remove();}catch{} }, 3000);
  }

  function bind(){
    if (burger) burger.addEventListener("click", toggleMobile);
    if (themeBtn) themeBtn.addEventListener("click", toggleTheme);
    if (langBtn) langBtn.addEventListener("click", () => {
      const cur = (getStored(KEY_LANG) || detectLang());
      applyLang(cur === "vi" ? "en" : "vi");
      toast((cur === "vi") ? "Switched to English" : "Đã chuyển sang Tiếng Việt");
    });

    // ESC closes drawer
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMobile();
    });

    // Close mobile drawer on navigation click
    document.addEventListener("click", (e) => {
      const a = e.target && e.target.closest ? e.target.closest("a") : null;
      if (!a) return;
      // internal link => close
      const href = a.getAttribute("href") || "";
      if (href.startsWith("/")) closeMobile();
    }, { capture:true });

    // If user hits /#something from old links, normalize:
    if (location.hash && location.hash !== "#"){
      // Do NOT keep hash routing (your rule)
      try { history.replaceState({}, "", location.pathname + location.search); } catch {}
      try { location.hash = ""; } catch {}
    }
  }

  function setupPwaAndNativeBridge() {
    // Register SW only in secure context and only if browser supports it.
    try {
      if (IS_SECURE && "serviceWorker" in navigator) {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      }
    } catch {}

    const PUSH_ENDPOINT = window.MN_PUSH_ENDPOINT || "/api/mobile/push/register";
    const PUSH_SENT_KEY = "mn_push_token_sent";

    async function sendPushToken(token, platform) {
      if (!token) return { ok: false, reason: "empty_token" };
      try {
        const sent = localStorage.getItem(PUSH_SENT_KEY);
        if (sent === token) return { ok: true, skipped: true };
      } catch {}

      try {
        const res = await fetch(PUSH_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            token,
            platform,
            source: "capacitor",
            at: Date.now()
          })
        });
        if (!res.ok) return { ok: false, reason: `push_endpoint_${res.status}` };
        try { localStorage.setItem(PUSH_SENT_KEY, token); } catch {}
        return { ok: true };
      } catch {
        return { ok: false, reason: "push_endpoint_failed" };
      }
    }

    function resolveBiometricPlugin() {
      const plugins = window.Capacitor?.Plugins || {};
      return (
        plugins.BiometricAuth ||
        plugins.NativeBiometric ||
        plugins.CapacitorBiometricAuth ||
        null
      );
    }

    // Unified bridge surface for web + Capacitor native shell.
    const Native = {
      isNative() {
        return !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === "function" && window.Capacitor.isNativePlatform());
      },
      platform() {
        if (!window.Capacitor || typeof window.Capacitor.getPlatform !== "function") return "web";
        try { return window.Capacitor.getPlatform(); } catch { return "web"; }
      },
      async pushEnable() {
        if (!this.isNative() || !window.Capacitor?.Plugins?.PushNotifications) {
          return { ok: false, reason: "native_push_unavailable" };
        }
        try {
          const plugin = window.Capacitor.Plugins.PushNotifications;
          const perm = await plugin.requestPermissions();
          if (perm?.receive === "denied") return { ok: false, reason: "push_permission_denied" };

          plugin.removeAllListeners?.();
          plugin.addListener?.("registration", (token) => {
            const value = token?.value || "";
            sendPushToken(value, this.platform()).catch(() => {});
          });
          plugin.addListener?.("registrationError", () => {});

          await plugin.register();
          return { ok: true };
        } catch {
          return { ok: false, reason: "push_register_failed" };
        }
      },
      async cameraPickPhoto() {
        if (!this.isNative() || !window.Capacitor?.Plugins?.Camera) {
          return { ok: false, reason: "native_camera_unavailable" };
        }
        try {
          const photo = await window.Capacitor.Plugins.Camera.getPhoto({
            quality: 85,
            resultType: "uri",
            source: "prompt"
          });
          return { ok: true, photo };
        } catch {
          return { ok: false, reason: "camera_failed" };
        }
      },
      async biometricVerify() {
        if (!this.isNative()) return { ok: false, reason: "native_biometric_unavailable" };
        const plugin = resolveBiometricPlugin();
        if (!plugin) return { ok: false, reason: "biometric_plugin_not_installed" };
        try {
          if (typeof plugin.authenticate === "function") {
            const result = await plugin.authenticate({
              reason: "Xác thực để tiếp tục",
              title: "muonnoi",
              subtitle: "Biometric verification"
            });
            return { ok: true, result };
          }
          if (typeof plugin.verifyIdentity === "function") {
            const result = await plugin.verifyIdentity({
              reason: "Xác thực để tiếp tục",
              title: "muonnoi",
              subtitle: "Biometric verification"
            });
            return { ok: true, result };
          }
          return { ok: false, reason: "biometric_api_unsupported" };
        } catch {
          return { ok: false, reason: "biometric_verify_failed" };
        }
      },
      async callStart(kind) {
        // Placeholder for WebRTC native optimization bridge.
        return { ok: false, reason: `call_bridge_not_wired:${kind || "unknown"}` };
      }
    };

    try { window.MNNative = Native; } catch {}
  }

  // Init
  (function init(){
    setupPwaAndNativeBridge();
    applyTheme(detectTheme());
    applyLang(detectLang());
    if (mobile) mobile.hidden = true;
    bind();
  })();

})();
