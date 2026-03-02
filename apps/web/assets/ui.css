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

  // Init
  (function init(){
    applyTheme(detectTheme());
    applyLang(detectLang());
    if (mobile) mobile.hidden = true;
    bind();
  })();

})();
