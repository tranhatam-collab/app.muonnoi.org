/* apps/web/assets/ui.js
   MUON NOI — UI Controller + Router (History API, no hash)
   - Drawer/Menu/Modal stable (always closable)
   - Clean internal links (/p/:id etc.)
   - Language: EN default, VI by browser, toggle with flags
   - Theme: dark/light + system
   - SEO: canonical updates on route (lightweight)
   - No libs, no tracking
*/
(() => {
  "use strict";

  // -----------------------------
  // Helpers
  // -----------------------------
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const now = () => Date.now();

  function safeJSONParse(s, fallback = null) {
    try { return JSON.parse(s); } catch { return fallback; }
  }
  function setText(el, txt) { if (el) el.textContent = txt; }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // small stable id generator (for demo cards)
  function sampleChainId(len = 12) {
    const a = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let out = "";
    const r = (n) => Math.floor(Math.random() * n);
    for (let i = 0; i < len; i++) out += a[r(a.length)];
    return out;
  }

  // -----------------------------
  // Toasts
  // -----------------------------
  function ensureToastRoot() {
    let root = $(".toasts");
    if (!root) {
      root = document.createElement("div");
      root.className = "toasts";
      root.setAttribute("aria-live", "polite");
      root.setAttribute("aria-atomic", "true");
      document.body.appendChild(root);
    }
    return root;
  }

  function toast(msg, { ms = 2400 } = {}) {
    const root = ensureToastRoot();
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = String(msg || "");
    root.appendChild(el);

    // animate in
    requestAnimationFrame(() => el.classList.add("is-in"));

    const rm = () => {
      el.classList.remove("is-in");
      el.classList.add("is-out");
      setTimeout(() => el.remove(), 220);
    };
    setTimeout(rm, clamp(ms, 1200, 9000));
  }

  // -----------------------------
  // App State
  // -----------------------------
  const State = {
    theme: "dark",          // 'dark'|'light'
    lang: "en",             // 'en'|'vi'
    i18n: null,             // loaded json
    route: { path: "/", params: {}, query: {} },
    overlays: {
      overlayEl: null,      // shared overlay (for drawer)
      modalOverlayEl: null  // overlay for modal
    }
  };

  // -----------------------------
  // Config (Routing Map)
  // -----------------------------
  const Routes = [
    { name: "home", path: /^\/$/, view: "home" },
    { name: "explore", path: /^\/explore\/?$/, view: "explore" },
    { name: "create", path: /^\/create\/?$/, view: "create" },
    { name: "inbox", path: /^\/inbox\/?$/, view: "inbox" },
    { name: "wallet", path: /^\/wallet\/?$/, view: "wallet" },
    { name: "settings", path: /^\/settings\/?$/, view: "settings" },

    { name: "login", path: /^\/login\/?$/, view: "login" },
    { name: "signup", path: /^\/signup\/?$/, view: "signup" },

    { name: "post", path: /^\/p\/([a-zA-Z0-9_\-]{6,120})\/?$/, view: "post", params: ["id"] },
    { name: "video", path: /^\/v\/([a-zA-Z0-9_\-]{6,120})\/?$/, view: "video", params: ["id"] },
    { name: "course", path: /^\/c\/([a-zA-Z0-9_\-]{6,120})\/?$/, view: "course", params: ["id"] },
    { name: "doc", path: /^\/d\/([a-zA-Z0-9_\-]{6,120})\/?$/, view: "doc", params: ["id"] },
    { name: "market", path: /^\/m\/([a-zA-Z0-9_\-]{6,120})\/?$/, view: "market", params: ["id"] },
    { name: "user", path: /^\/u\/([a-zA-Z0-9_\-\.]{2,80})\/?$/, view: "user", params: ["handle"] },

    { name: "help", path: /^\/help\/?$/, external: "https://docs.muonnoi.org/" },
    { name: "docs", path: /^\/docs\/?$/, external: "https://docs.muonnoi.org/" }
  ];

  function parseQuery(search) {
    const q = {};
    const s = (search || "").replace(/^\?/, "");
    if (!s) return q;
    for (const part of s.split("&")) {
      if (!part) continue;
      const [k, v] = part.split("=");
      const key = decodeURIComponent(k || "").trim();
      if (!key) continue;
      q[key] = decodeURIComponent(v || "").trim();
    }
    return q;
  }

  function matchRoute(pathname) {
    for (const r of Routes) {
      const m = pathname.match(r.path);
      if (!m) continue;
      const params = {};
      if (r.params && r.params.length) {
        r.params.forEach((k, i) => params[k] = m[i + 1]);
      }
      return { ...r, params };
    }
    return { name: "home", view: "home", params: {} };
  }

  function canonicalUrl(pathname, search = "") {
    const base = `${location.protocol}//${location.host}`;
    return `${base}${pathname}${search || ""}`;
  }

  // -----------------------------
  // Link Generator (single source)
  // -----------------------------
  const Link = {
    home: () => "/",
    explore: () => "/explore",
    create: () => "/create",
    inbox: () => "/inbox",
    wallet: () => "/wallet",
    settings: () => "/settings",
    login: () => "/login",
    signup: () => "/signup",

    post: (id) => `/p/${encodeURIComponent(String(id || "").trim())}`,
    video: (id) => `/v/${encodeURIComponent(String(id || "").trim())}`,
    course: (id) => `/c/${encodeURIComponent(String(id || "").trim())}`,
    doc: (id) => `/d/${encodeURIComponent(String(id || "").trim())}`,
    market: (id) => `/m/${encodeURIComponent(String(id || "").trim())}`,
    user: (handle) => `/u/${encodeURIComponent(String(handle || "").trim())}`,

    externalDocs: () => "https://docs.muonnoi.org/",
    externalHome: () => "https://muonnoi.org/"
  };

  // -----------------------------
  // DOM Handles
  // -----------------------------
  const UI = {
    app: null,

    btnMenu: null,
    btnSearch: null,
    btnNoti: null,
    btnCommand: null,
    btnTheme: null,
    btnLang: null,

    rail: null,
    drawerSearch: null,
    drawerNoti: null,
    menu: null,
    modal: null,

    view: null,
    pageTitle: null,
    pageSub: null,

    navLinks: [],
    tabbarLinks: []
  };

  function resolveUI() {
    UI.app = $(".app") || document.body;

    UI.btnMenu = $("#btnMenu") || $('[data-action="menu"]');
    UI.btnSearch = $("#btnSearch") || $('[data-action="search"]');
    UI.btnNoti = $("#btnNoti") || $('[data-action="noti"]');
    UI.btnCommand = $("#btnCommand") || $('[data-action="command"]');
    UI.btnTheme = $("#btnTheme") || $('[data-action="theme"]');
    UI.btnLang = $("#btnLang") || $('[data-action="lang"]');

    UI.rail = $(".rail") || $("#rail");

    UI.drawerSearch = $("#searchDrawer") || $('.drawer[data-drawer="search"]');
    UI.drawerNoti = $("#notiDrawer") || $('.drawer[data-drawer="noti"]');

    UI.menu = $("#profileMenu") || $(".menu");
    UI.modal = $("#commandModal") || $(".modal");

    UI.view = $("#view") || $("#mainView") || $(".main");
    UI.pageTitle = $("#pageTitle");
    UI.pageSub = $("#pageSub");

    UI.navLinks = $$('[data-nav]');
    UI.tabbarLinks = $$('[data-tab]');
  }

  // -----------------------------
  // Overlay Manager (fix "can't close")
  // -----------------------------
  function ensureOverlay(kind) {
    const z = (kind === "modal") ? 1600 : 1200;
    let el = (kind === "modal") ? State.overlays.modalOverlayEl : State.overlays.overlayEl;
    if (el && el.isConnected) return el;

    el = document.createElement("div");
    el.className = "overlay";
    el.style.zIndex = String(z);
    el.setAttribute("data-overlay", kind);
    el.hidden = true;
    el.style.display = "none";

    el.addEventListener("click", () => {
      if (kind === "modal") closeModal();
      else closeAllDrawersAndMenus();
    });

    document.body.appendChild(el);

    if (kind === "modal") State.overlays.modalOverlayEl = el;
    else State.overlays.overlayEl = el;

    return el;
  }

  function showOverlay(kind) {
    const el = ensureOverlay(kind);
    el.hidden = false;
    el.style.display = "block";
    document.documentElement.style.overflow = "hidden";
  }

  function hideOverlay(kind) {
    const el = (kind === "modal") ? State.overlays.modalOverlayEl : State.overlays.overlayEl;
    if (!el) return;
    el.style.display = "none";
    el.hidden = true;

    if (!isAnyLayerOpen()) {
      document.documentElement.style.overflow = "";
    }
  }

  function isAnyLayerOpen() {
    const railOpen = UI.rail && UI.rail.classList.contains("is-open");
    const sOpen = UI.drawerSearch && UI.drawerSearch.classList.contains("is-open");
    const nOpen = UI.drawerNoti && UI.drawerNoti.classList.contains("is-open");
    const menuOpen = UI.menu && !(UI.menu.hidden || UI.menu.style.display === "none");
    const modalOpen = UI.modal && !(UI.modal.hidden || UI.modal.style.display === "none");
    return !!(railOpen || sOpen || nOpen || menuOpen || modalOpen);
  }

  function syncOverlay() {
    const modalOpen = UI.modal && !(UI.modal.hidden || UI.modal.style.display === "none");
    const anyDrawerLayer = !!(
      (UI.rail && UI.rail.classList.contains("is-open")) ||
      (UI.drawerSearch && UI.drawerSearch.classList.contains("is-open")) ||
      (UI.drawerNoti && UI.drawerNoti.classList.contains("is-open")) ||
      (UI.menu && !(UI.menu.hidden || UI.menu.style.display === "none"))
    );

    if (modalOpen) showOverlay("modal"); else hideOverlay("modal");
    if (anyDrawerLayer) showOverlay("drawer"); else hideOverlay("drawer");
  }

  // -----------------------------
  // Drawer/Menu/Modal controls
  // -----------------------------
  function closeRail() { if (UI.rail) UI.rail.classList.remove("is-open"); }
  function openRail() {
    if (!UI.rail) return;
    closeDrawers();
    closeMenu();
    closeModal();
    UI.rail.classList.add("is-open");
    syncOverlay();
  }
  function toggleRail() {
    if (!UI.rail) return;
    if (UI.rail.classList.contains("is-open")) {
      closeRail();
      syncOverlay();
    } else {
      openRail();
    }
  }

  function closeDrawers() {
    if (UI.drawerSearch) UI.drawerSearch.classList.remove("is-open");
    if (UI.drawerNoti) UI.drawerNoti.classList.remove("is-open");
  }

  function openDrawer(which) {
    closeRail();
    closeMenu();
    closeModal();
    closeDrawers();

    const target = (which === "search") ? UI.drawerSearch : UI.drawerNoti;
    if (!target) return;

    target.classList.add("is-open");
    syncOverlay();

    if (which === "search") {
      const inp = target.querySelector("input, textarea, [contenteditable='true']");
      if (inp) setTimeout(() => inp.focus(), 50);
    }
  }

  function toggleDrawer(which) {
    const target = (which === "search") ? UI.drawerSearch : UI.drawerNoti;
    if (!target) return;
    const open = target.classList.contains("is-open");
    if (open) target.classList.remove("is-open");
    else openDrawer(which);
    syncOverlay();
  }

  function openMenu() {
    if (!UI.menu) return;
    closeRail();
    closeDrawers();
    closeModal();
    UI.menu.hidden = false;
    UI.menu.style.display = "block";
    syncOverlay();
  }

  function closeMenu() {
    if (!UI.menu) return;
    UI.menu.hidden = true;
    UI.menu.style.display = "none";
    syncOverlay();
  }

  function toggleMenu() {
    if (!UI.menu) return;
    const open = !(UI.menu.hidden || UI.menu.style.display === "none");
    if (open) closeMenu();
    else openMenu();
  }

  function openModal() {
    if (!UI.modal) return;
    closeRail();
    closeDrawers();
    closeMenu();
    UI.modal.hidden = false;
    UI.modal.style.display = "flex";
    syncOverlay();

    const inp = UI.modal.querySelector("input, textarea, [contenteditable='true']");
    if (inp) setTimeout(() => inp.focus(), 50);
  }

  function closeModal() {
    if (!UI.modal) return;
    UI.modal.hidden = true;
    UI.modal.style.display = "none";
    syncOverlay();
  }

  function toggleModal() {
    if (!UI.modal) return;
    const open = !(UI.modal.hidden || UI.modal.style.display === "none");
    if (open) closeModal();
    else openModal();
  }

  function closeAllDrawersAndMenus() {
    closeRail();
    closeDrawers();
    if (UI.menu) { UI.menu.hidden = true; UI.menu.style.display = "none"; }
    syncOverlay();
  }

  // -----------------------------
  // Theme & Language
  // -----------------------------
  function detectLang() {
    try {
      const saved = localStorage.getItem("mn_lang");
      if (saved === "vi" || saved === "en") return saved;
    } catch {}
    const nav = (navigator.language || "en").toLowerCase();
    // default international EN; VI if browser is VI
    return nav.startsWith("vi") ? "vi" : "en";
  }

  function detectTheme() {
    try {
      const saved = localStorage.getItem("mn_theme");
      if (saved === "dark" || saved === "light") return saved;
    } catch {}
    return "dark";
  }

  async function loadI18n() {
    const url = "/assets/i18n.json";
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("i18n fetch failed");
      const json = await res.json();
      State.i18n = json;
    } catch {
      State.i18n = null;
    }
  }

  function t(key) {
    const L = State.lang;
    return (State.i18n && State.i18n[L] && State.i18n[L][key]) || null;
  }

  function applyLang(lang) {
    State.lang = (lang === "vi") ? "vi" : "en";
    try { localStorage.setItem("mn_lang", State.lang); } catch {}
    document.documentElement.lang = State.lang;

    const langCode = $("#langCode");
    const flagA = $("#flagA");
    const flagB = $("#flagB");
    if (langCode) langCode.textContent = State.lang.toUpperCase();
    if (flagA && flagB) { flagA.textContent = "🇺🇸"; flagB.textContent = "🇻🇳"; }

    // apply static i18n nodes if used
    $$("[data-i18n]").forEach((el) => {
      const k = el.getAttribute("data-i18n");
      if (!k) return;
      const val = t(k);
      if (val != null) el.textContent = val;
    });

    // rerender current view (dynamic strings)
    renderRoute(State.route.path, State.route.params, State.route.query);
  }

  function toggleLang() {
    applyLang(State.lang === "en" ? "vi" : "en");
  }

  function applyTheme(theme) {
    State.theme = (theme === "light") ? "light" : "dark";
    try { localStorage.setItem("mn_theme", State.theme); } catch {}
    if (UI.app && UI.app.setAttribute) UI.app.setAttribute("data-theme", State.theme);
    else document.body.setAttribute("data-theme", State.theme);

    const themeIconUse = $("#themeIconUse");
    if (themeIconUse) {
      themeIconUse.setAttribute("href", State.theme === "dark"
        ? "/assets/icons.svg#i-sun"
        : "/assets/icons.svg#i-moon");
    }
  }

  function toggleTheme() {
    applyTheme(State.theme === "dark" ? "light" : "dark");
  }

  // -----------------------------
  // Router (History API, no #)
  // -----------------------------
  function navigate(path, { replace = false, closeLayers = true } = {}) {
    if (!path) return;

    const basePath = path.split("?")[0] || "/";
    const matched = matchRoute(basePath);

    if (matched.external) {
      window.location.href = matched.external;
      return;
    }

    if (closeLayers) {
      closeAllDrawersAndMenus();
      closeModal();
    }

    const url = new URL(path, location.origin);
    if (replace) history.replaceState({}, "", url.pathname + url.search);
    else history.pushState({}, "", url.pathname + url.search);

    onRouteChange();
  }

  function onRouteChange() {
    const pathname = location.pathname || "/";
    const search = location.search || "";
    const query = parseQuery(search);

    const r = matchRoute(pathname);
    State.route = { path: pathname, params: r.params || {}, query };

    // update canonical + og:url
    let can = $('link[rel="canonical"]');
    if (!can) {
      can = document.createElement("link");
      can.rel = "canonical";
      document.head.appendChild(can);
    }
    can.href = canonicalUrl(pathname, search);

    const ogUrl = $('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute("content", can.href);

    renderRoute(pathname, r.params || {}, query);
    setActiveNav(pathname);
  }

  function setActiveNav(pathname) {
    const setActive = (el, active) => {
      if (!el) return;
      if (active) el.classList.add("is-active");
      else el.classList.remove("is-active");
    };

    UI.navLinks.forEach((a) => {
      const target = a.getAttribute("data-nav") || a.getAttribute("href") || "";
      const p = (target.startsWith("http")) ? null : (target.split("?")[0] || "");
      if (!p) return;
      setActive(a, p === pathname);
    });

    UI.tabbarLinks.forEach((a) => {
      const target = a.getAttribute("data-tab") || a.getAttribute("href") || "";
      const p = (target.startsWith("http")) ? null : (target.split("?")[0] || "");
      if (!p) return;
      setActive(a, p === pathname);
    });
  }

  // -----------------------------
  // Intercept internal link clicks
  // -----------------------------
  function isInternalAnchor(a) {
    if (!a) return false;
    const href = a.getAttribute("href") || "";
    if (!href) return false;
    if (href.startsWith("mailto:") || href.startsWith("tel:")) return false;
    if (href.startsWith("http://") || href.startsWith("https://")) return false;
    if (href.startsWith("#")) return false;
    return true;
  }

  function bindGlobalLinkInterceptor() {
    document.addEventListener("click", (e) => {
      const a = e.target && e.target.closest ? e.target.closest("a") : null;
      if (!a) return;

      // allow new tab / modifiers
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      // external
      const href = a.getAttribute("href") || "";
      if (!isInternalAnchor(a)) return;

      // allow real file links
      if (href.includes(".pdf") || href.includes(".zip") || href.includes(".png") || href.includes(".jpg")) return;

      e.preventDefault();
      navigate(href);
    }, { capture: true });

    // also intercept buttons using data-go
    document.addEventListener("click", (e) => {
      const btn = e.target && e.target.closest ? e.target.closest("[data-go]") : null;
      if (!btn) return;
      const path = btn.getAttribute("data-go");
      if (!path) return;
      e.preventDefault();
      navigate(path);
    }, { capture: true });
  }

  // -----------------------------
  // Close buttons [data-close]
  // -----------------------------
  function bindCloseButtons() {
    document.addEventListener("click", (e) => {
      const x = e.target && e.target.closest ? e.target.closest("[data-close]") : null;
      if (!x) return;
      const kind = x.getAttribute("data-close");
      e.preventDefault();
      if (kind === "modal") closeModal();
      else closeAllDrawersAndMenus();
    }, { capture: true });
  }

  // -----------------------------
  // Keyboard shortcuts (Esc, Cmd/Ctrl+K)
  // -----------------------------
  function bindKeyboard() {
    document.addEventListener("keydown", (e) => {
      // ESC closes all layers
      if (e.key === "Escape") {
        closeModal();
        closeAllDrawersAndMenus();
        return;
      }

      // Cmd/Ctrl + K toggles command modal
      const k = e.key && e.key.toLowerCase ? e.key.toLowerCase() : "";
      if ((e.ctrlKey || e.metaKey) && k === "k") {
        e.preventDefault();
        toggleModal();
      }
    });
  }

  // -----------------------------
  // Views
  // -----------------------------
  function renderRoute(pathname, params, query) {
    if (!UI.view) return;

    const matched = matchRoute(pathname);
    const view = matched.view || "home";

    if (UI.pageTitle) setText(UI.pageTitle, pageTitleFor(view, params));
    if (UI.pageSub) setText(UI.pageSub, pageSubFor(view));

    if (view === "home") {
      UI.view.innerHTML = homeHTML();
      bindHomeActions();
      return;
    }

    if (view === "login") {
      UI.view.innerHTML = authHTML("login");
      bindAuthActions();
      return;
    }

    if (view === "signup") {
      UI.view.innerHTML = authHTML("signup");
      bindAuthActions();
      return;
    }

    UI.view.innerHTML = shellHTML(view, params);
    bindShellActions();
  }

  function pageTitleFor(view, params) {
    const L = State.lang;
    if (L === "vi") {
      switch (view) {
        case "home": return "Muon Noi";
        case "explore": return "Khám Phá";
        case "create": return "Tạo";
        case "inbox": return "Tin Nhắn";
        case "wallet": return "Ví";
        case "settings": return "Cài Đặt";
        case "login": return "Đăng Nhập";
        case "signup": return "Đăng Ký";
        case "post": return "Bài Viết";
        case "user": return "Hồ Sơ";
        default: return "Muon Noi";
      }
    }
    switch (view) {
      case "home": return "Muon Noi";
      case "explore": return "Explore";
      case "create": return "Create";
      case "inbox": return "Inbox";
      case "wallet": return "Wallet";
      case "settings": return "Settings";
      case "login": return "Sign In";
      case "signup": return "Create Account";
      case "post": return "Post";
      case "user": return "Profile";
      default: return "Muon Noi";
    }
  }

  function pageSubFor(view) {
    const L = State.lang;
    if (L === "vi") {
      if (view === "home") return "Không phải bảng tin. Là không gian vận hành: làm việc, mua bán, học, live, nhắn tin, gọi, thanh toán.";
      if (view === "login") return "Đăng nhập nhanh hoặc Magic Link, không theo dõi hành vi.";
      if (view === "signup") return "Tạo tài khoản để bắt đầu, vẫn ưu tiên riêng tư.";
      return "Module đang hoàn thiện theo lộ trình.";
    }
    if (view === "home") return "Not a feed. A social operating space: work, market, learn, live, message, pay.";
    if (view === "login") return "Fast sign in or Magic Link. No behavioral tracking.";
    if (view === "signup") return "Create an account to begin. Privacy-first by design.";
    return "Module is being finalized per roadmap.";
  }

  function shellHTML(view, params) {
    const L = State.lang;
    const title = pageTitleFor(view, params);
    const hint = (L === "vi")
      ? "Module này đang ở trạng thái khung. Bạn có thể quay lại trang chủ hoặc mở Docs."
      : "This module is currently a shell. You can go Home or open Docs.";
    const back = (L === "vi") ? "Về Trang Chủ" : "Back Home";
    const docs = (L === "vi") ? "Mở Docs" : "Open Docs";

    return `
      <section class="panel panel--feed" style="margin-top:16px">
        <div class="panel__head">
          <div class="panel__titleRow">
            <div class="h2">${escapeHTML(title)}</div>
          </div>
          <div class="panel__headActions">
            <button class="btn btn--ghost" type="button" data-go="${Link.home()}">${escapeHTML(back)}</button>
            <a class="btn btn--primary" href="${Link.externalDocs()}" rel="noopener">${escapeHTML(docs)}</a>
          </div>
        </div>
        <div class="panel__block">
          <div class="hint">${escapeHTML(hint)}</div>
          ${renderParamBlock(params)}
        </div>
      </section>
    `;
  }

  function renderParamBlock(params) {
    if (!params) return "";
    const keys = Object.keys(params);
    if (!keys.length) return "";
    const rows = keys.map(k => `<div class="status__row"><span class="muted">${escapeHTML(k)}</span><span class="pill">${escapeHTML(params[k])}</span></div>`).join("");
    return `<div class="status" style="margin-top:14px">${rows}</div>`;
  }

  function homeHTML() {
    const L = State.lang;

    const heroTitle = "Muon Noi";
    const heroLead = (L === "vi")
      ? "Một Không Gian Vận Hành Xã Hội Tất Cả Trong Một. Làm Việc, Kiếm Tiền, Mua Bán, Kinh Doanh, Chia Sẻ Video, Tài Liệu, Khóa Học, Livestream, Nhắn Tin, Gọi, Thanh Toán."
      : "An all-in-one Social Operating Space. Work, earn, trade, business, learn, video, livestream, message, call, pay.";

    const ctaA = (L === "vi") ? "Tạo Một Bài" : "Create a Post";
    const ctaB = (L === "vi") ? "Khám Phá" : "Explore";
    const ctaC = (L === "vi") ? "Mở Ví" : "Open Wallet";
    const ctaD = (L === "vi") ? "Tin Nhắn" : "Inbox";

    const secA = (L === "vi") ? "Luồng Hoạt Động" : "Activity Stream";
    const secB = (L === "vi") ? "Bảng Điều Khiển" : "Control Panel";
    const secC = (L === "vi") ? "Tuyên Ngôn Bảo Mật" : "Privacy & Security";
    const secD = (L === "vi") ? "Link Chia Sẻ Sạch" : "Clean Share Links";

    const privacyText = (L === "vi")
      ? "Không thu thập dữ liệu hành vi. Không pixel theo dõi. Mã hóa đầu cuối là mặc định cho liên lạc và nội dung nhạy cảm."
      : "No behavioral data harvesting. No tracking pixels. End-to-end encryption is the default for sensitive content and communications.";

    const linksText = (L === "vi")
      ? "Mọi chia sẻ dùng link sạch: /p/<id>, /v/<id>, /m/<id>. Không dùng #. Link tồn tại bền vững để không bao giờ “chết”."
      : "Every share uses clean links: /p/<id>, /v/<id>, /m/<id>. No hashes. Durable URLs that never “die”.";

    const sampleId = sampleChainId();
    const samplePost = canonicalUrl(Link.post(sampleId));

    const copy = (L === "vi") ? "Sao Chép Link Mẫu" : "Copy Sample Link";
    const open = (L === "vi") ? "Mở Link Mẫu" : "Open Sample";
    const sign = (L === "vi") ? "Đăng Nhập" : "Sign In";

    return `
      <section class="hero">
        <div class="hero__content">
          <div class="kicker">${escapeHTML(L === "vi" ? "Social Operating Space" : "Social Operating Space")}</div>
          <h1>${escapeHTML(heroTitle)}</h1>
          <p class="lead">${escapeHTML(heroLead)}</p>

          <div class="hero__actions">
            <button class="btn btn--primary" type="button" data-go="${Link.create()}">
              <svg class="icon" aria-hidden="true"><use href="/assets/icons.svg#i-plus"></use></svg>
              <span>${escapeHTML(ctaA)}</span>
            </button>

            <button class="btn btn--ghost" type="button" data-go="${Link.explore()}">
              <svg class="icon" aria-hidden="true"><use href="/assets/icons.svg#i-compass"></use></svg>
              <span>${escapeHTML(ctaB)}</span>
            </button>

            <button class="btn btn--ghost" type="button" data-go="${Link.wallet()}">
              <svg class="icon" aria-hidden="true"><use href="/assets/icons.svg#i-settings"></use></svg>
              <span>${escapeHTML(ctaC)}</span>
            </button>

            <button class="btn btn--ghost" type="button" data-go="${Link.inbox()}">
              <svg class="icon" aria-hidden="true"><use href="/assets/icons.svg#i-chat"></use></svg>
              <span>${escapeHTML(ctaD)}</span>
            </button>

            <button class="btn btn--ghost btn--auth" type="button" data-auth="open">
              <svg class="icon" aria-hidden="true"><use href="/assets/icons.svg#i-user"></use></svg>
              <span>${escapeHTML(sign)}</span>
            </button>
          </div>

          <div class="hero__chips" aria-label="Highlights">
            <span class="chip">${escapeHTML(L === "vi" ? "Không Like" : "No Likes")}</span>
            <span class="chip">${escapeHTML(L === "vi" ? "Không Feed Nhiễu" : "No Noisy Feed")}</span>
            <span class="chip">${escapeHTML(L === "vi" ? "Bảo Mật Cao" : "High Security")}</span>
            <span class="chip">${escapeHTML(L === "vi" ? "Không Theo Dõi" : "No Tracking")}</span>
          </div>
        </div>

        <div class="hero__visual">
          <div class="heroCard">
            <div class="heroCard__top">
              <div class="dots" aria-hidden="true">
                <span class="dot dot--g"></span>
                <span class="dot dot--y"></span>
                <span class="dot dot--r"></span>
              </div>
              <div class="heroCard__tag">${escapeHTML(L === "vi" ? "Protocol" : "Protocol")}</div>
            </div>
            <div class="heroCard__body">
              <h3>Muon Noi Protocol</h3>
              <p>${escapeHTML(L === "vi"
                ? "Tất cả hướng tới vận hành xã hội hữu ích, và chuẩn bị cho Web3 trong tương lai."
                : "Built for useful social operation and ready for Web3 future.")}</p>

              <div class="heroStats">
                <div class="heroStat">
                  <strong>∞</strong>
                  <span>${escapeHTML(L === "vi" ? "Link Bền Vững" : "Durable Links")}</span>
                </div>
                <div class="heroStat">
                  <strong>256</strong>
                  <span>${escapeHTML(L === "vi" ? "Mã Hóa" : "Encryption")}</span>
                </div>
                <div class="heroStat">
                  <strong>0</strong>
                  <span>${escapeHTML(L === "vi" ? "Bán Dữ Liệu" : "Data Selling")}</span>
                </div>
              </div>

              <div class="heroSample">
                <div class="heroSample__label">${escapeHTML(L === "vi" ? "Ví dụ Link chia sẻ" : "Sample share link")}</div>
                <div class="heroSample__row">
                  <code class="code">${escapeHTML(samplePost)}</code>
                </div>
                <div class="heroSample__actions">
                  <button class="btn btn--ghost" type="button" data-copy="${escapeHTML(samplePost)}">${escapeHTML(copy)}</button>
                  <button class="btn btn--primary" type="button" data-go="${Link.post(sampleId)}">${escapeHTML(open)}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="grid3">
        <div class="panel panel--mini">
          <div class="panel__head">
            <div class="h2">${escapeHTML(secA)}</div>
          </div>
          <div class="panel__block">
            <div class="hint">${escapeHTML(L === "vi"
              ? "Không phải feed gây nghiện. Đây là luồng hoạt động có ích."
              : "Not an addictive feed. A useful activity stream.")}</div>

            ${homeMockCards(L).join("")}
          </div>
        </div>

        <div class="panel panel--mini">
          <div class="panel__head">
            <div class="h2">${escapeHTML(secB)}</div>
          </div>
          <div class="panel__block">
            <div class="kpiGrid">
              <div class="kpi"><strong>Work</strong><span>${escapeHTML(L === "vi" ? "Dự án, việc làm" : "Projects & jobs")}</span></div>
              <div class="kpi"><strong>Market</strong><span>${escapeHTML(L === "vi" ? "Mua bán, dịch vụ" : "Trade & services")}</span></div>
              <div class="kpi"><strong>Learn</strong><span>${escapeHTML(L === "vi" ? "Tài liệu, khóa học" : "Docs & courses")}</span></div>
              <div class="kpi"><strong>Live</strong><span>${escapeHTML(L === "vi" ? "Video, livestream" : "Video & live")}</span></div>
              <div class="kpi"><strong>Chat</strong><span>${escapeHTML(L === "vi" ? "Nhắn tin, gọi" : "Message & call")}</span></div>
              <div class="kpi"><strong>Pay</strong><span>${escapeHTML(L === "vi" ? "Thanh toán" : "Payments")}</span></div>
            </div>

            <div class="grid2" style="margin-top:14px">
              <button class="btn btn--primary" type="button" data-go="${Link.create()}">${escapeHTML(L === "vi" ? "Bắt đầu tạo" : "Start creating")}</button>
              <button class="btn btn--ghost" type="button" data-go="${Link.explore()}">${escapeHTML(L === "vi" ? "Xem hệ sinh thái" : "View ecosystem")}</button>
            </div>
          </div>
        </div>

        <div class="panel panel--mini">
          <div class="panel__head">
            <div class="h2">${escapeHTML(secC)}</div>
          </div>
          <div class="panel__block">
            <div class="hint">${escapeHTML(privacyText)}</div>
            <div class="status" style="margin-top:14px">
              <div class="status__row"><span class="muted">${escapeHTML(L === "vi" ? "Tracking" : "Tracking")}</span><span class="pill pill--ok">${escapeHTML(L === "vi" ? "Không" : "No")}</span></div>
              <div class="status__row"><span class="muted">${escapeHTML(L === "vi" ? "Analytics" : "Analytics")}</span><span class="pill pill--ok">${escapeHTML(L === "vi" ? "Không" : "No")}</span></div>
              <div class="status__row"><span class="muted">${escapeHTML(L === "vi" ? "Chia sẻ link" : "Share links")}</span><span class="pill">${escapeHTML(L === "vi" ? "Clean URLs" : "Clean URLs")}</span></div>
              <div class="status__row"><span class="muted">${escapeHTML(L === "vi" ? "Mã hóa" : "Encryption")}</span><span class="pill">${escapeHTML("E2E / AES-GCM")}</span></div>
            </div>
          </div>
        </div>
      </section>

      <section class="panel panel--feed" style="margin-top:16px">
        <div class="panel__head">
          <div class="panel__titleRow">
            <div class="h2">${escapeHTML(secD)}</div>
          </div>
          <div class="panel__headActions">
            <a class="btn btn--ghost" href="${Link.externalHome()}" rel="noopener">${escapeHTML(L === "vi" ? "Trang giới thiệu" : "Public site")}</a>
            <a class="btn btn--primary" href="${Link.externalDocs()}" rel="noopener">${escapeHTML(L === "vi" ? "Mở Docs" : "Open Docs")}</a>
          </div>
        </div>
        <div class="panel__block">
          <div class="hint">${escapeHTML(linksText)}</div>
          <div class="grid2" style="margin-top:14px">
            <div class="linkCard">
              <div class="linkCard__t">${escapeHTML(L === "vi" ? "Bài viết" : "Post")}</div>
              <code class="code">/p/Abc123XyZ</code>
            </div>
            <div class="linkCard">
              <div class="linkCard__t">${escapeHTML(L === "vi" ? "Hồ sơ" : "Profile")}</div>
              <code class="code">/u/yourname</code>
            </div>
            <div class="linkCard">
              <div class="linkCard__t">${escapeHTML(L === "vi" ? "Video" : "Video")}</div>
              <code class="code">/v/9kLmN0pQ</code>
            </div>
            <div class="linkCard">
              <div class="linkCard__t">${escapeHTML(L === "vi" ? "Chợ" : "Market")}</div>
              <code class="code">/m/item987</code>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function homeMockCards(L) {
    const a = [];
    const mk = (title, meta, kind, id) => {
      const href = kind === "post" ? Link.post(id) : (kind === "user" ? Link.user(id) : Link.market(id));
      return `
        <article class="card">
          <div class="card__top">
            <span class="pill">${escapeHTML(kind.toUpperCase())}</span>
            <button class="iconbtn iconbtn--tiny" type="button" data-go="${href}" aria-label="Open">
              <svg class="icon" aria-hidden="true"><use href="/assets/icons.svg#i-compass"></use></svg>
            </button>
          </div>
          <div class="card__title">${escapeHTML(title)}</div>
          <div class="card__meta">${escapeHTML(meta)}</div>
          <div class="card__actions">
            <button class="btn btn--ghost" type="button" data-go="${href}">${escapeHTML(L === "vi" ? "Mở" : "Open")}</button>
            <button class="btn btn--primary" type="button" data-go="${Link.create()}">${escapeHTML(L === "vi" ? "Tạo tương tự" : "Create similar")}</button>
          </div>
        </article>
      `;
    };

    a.push(mk(
      L === "vi" ? "Tìm cộng sự cho dự án thương mại điện tử địa phương" : "Looking for partners for a local commerce project",
      L === "vi" ? "Work • Đà Lạt • 2 giờ trước" : "Work • Da Lat • 2 hours ago",
      "post",
      sampleChainId()
    ));
    a.push(mk(
      L === "vi" ? "Khóa học: Xây hệ thống bán hàng bền vững" : "Course: Build a sustainable sales system",
      L === "vi" ? "Learn • Video + Docs" : "Learn • Video + Docs",
      "post",
      sampleChainId()
    ));
    a.push(mk(
      L === "vi" ? "Sản phẩm: Dịch vụ thiết kế landing page" : "Offer: Landing page design service",
      L === "vi" ? "Market • Thanh toán online/offline" : "Market • Online/offline payment",
      "market",
      sampleChainId()
    ));
    return a;
  }

  // -----------------------------
  // Auth (UI + safe hooks)
  // -----------------------------
  function authHTML(mode) {
    const L = State.lang;
    const isLogin = mode === "login";

    const title = isLogin
      ? (L === "vi" ? "Đăng Nhập" : "Sign In")
      : (L === "vi" ? "Đăng Ký" : "Create Account");

    const lead = (L === "vi")
      ? "Không theo dõi. Không bán dữ liệu. Chọn đăng nhập nhanh hoặc Magic Link."
      : "No tracking. No data selling. Choose fast sign-in or Magic Link.";

    const or = (L === "vi" ? "Hoặc" : "Or");
    const emailLabel = (L === "vi" ? "Email" : "Email");
    const emailPh = (L === "vi" ? "Nhập email của bạn" : "Enter your email");
    const send = (L === "vi" ? "Gửi Magic Link" : "Send Magic Link");
    const note = (L === "vi"
      ? "Magic Link sẽ gửi vào email để bạn đăng nhập không cần mật khẩu."
      : "Magic Link will be emailed to you. No password needed.");

    const switchTxt = isLogin
      ? (L === "vi" ? "Chưa có tài khoản? Đăng ký" : "No account? Sign up")
      : (L === "vi" ? "Đã có tài khoản? Đăng nhập" : "Already have an account? Sign in");

    const switchGo = isLogin ? Link.signup() : Link.login();

    return `
      <section class="panel panel--feed" style="margin-top:16px">
        <div class="panel__head">
          <div class="panel__titleRow">
            <div class="h2">${escapeHTML(title)}</div>
          </div>
          <div class="panel__headActions">
            <button class="btn btn--ghost" type="button" data-go="${Link.home()}">
              ${escapeHTML(L === "vi" ? "Về Trang Chủ" : "Back Home")}
            </button>
          </div>
        </div>

        <div class="panel__block">
          <div class="hint">${escapeHTML(lead)}</div>

          <div class="authGrid" style="margin-top:14px">
            <button class="btn btn--primary authBtn" type="button" data-auth-provider="google">
              <span class="authBtn__icon">G</span>
              <span>${escapeHTML(L === "vi" ? "Tiếp tục với Google" : "Continue with Google")}</span>
            </button>

            <button class="btn btn--ghost authBtn" type="button" data-auth-provider="github">
              <span class="authBtn__icon">⌁</span>
              <span>${escapeHTML(L === "vi" ? "Tiếp tục với GitHub" : "Continue with GitHub")}</span>
            </button>

            <button class="btn btn--ghost authBtn" type="button" data-auth-provider="apple">
              <span class="authBtn__icon"></span>
              <span>${escapeHTML(L === "vi" ? "Tiếp tục với Apple" : "Continue with Apple")}</span>
            </button>
          </div>

          <div class="authOr"><span>${escapeHTML(or)}</span></div>

          <form class="authForm" data-auth-form="magic">
            <label class="label">${escapeHTML(emailLabel)}</label>
            <input class="input" type="email" name="email" required autocomplete="email" placeholder="${escapeHTML(emailPh)}" />
            <button class="btn btn--primary" type="submit">${escapeHTML(send)}</button>
            <div class="hint" style="margin-top:10px">${escapeHTML(note)}</div>
          </form>

          <div style="margin-top:16px">
            <button class="btn btn--ghost" type="button" data-go="${switchGo}">
              ${escapeHTML(switchTxt)}
            </button>
          </div>
        </div>
      </section>
    `;
  }

  function bindAuthActions() {
    $$("[data-auth-provider]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const p = btn.getAttribute("data-auth-provider");
        if (!p) return;
        await authStartProvider(p);
      });
    });

    const f = $('[data-auth-form="magic"]');
    if (f) {
      f.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(f);
        const email = String(fd.get("email") || "").trim();
        if (!email || !email.includes("@")) {
          toast(State.lang === "vi" ? "Email không hợp lệ." : "Invalid email.");
          return;
        }
        await authSendMagicLink(email);
      });
    }
  }

  async function authStartProvider(provider) {
    const returnTo = location.pathname + location.search;
    const url = `/api/auth/oauth/start?provider=${encodeURIComponent(provider)}&return=${encodeURIComponent(returnTo)}`;

    try {
      const res = await fetch(url, { method: "GET" });
      if (res.redirected) {
        location.href = res.url;
        return;
      }
      if (res.status === 200) {
        const data = await res.json().catch(() => null);
        if (data && data.redirectUrl) {
          location.href = data.redirectUrl;
          return;
        }
      }
      toast(State.lang === "vi"
        ? "Chưa cấu hình OAuth trên server. Cần Worker /api/auth/..."
        : "OAuth server not configured yet. Implement Worker /api/auth/...");
    } catch {
      toast(State.lang === "vi" ? "Không thể mở OAuth lúc này." : "Unable to start OAuth right now.");
    }
  }

  async function authSendMagicLink(email) {
    const body = { email, return: location.pathname + location.search };
    try {
      const res = await fetch("/api/auth/magic/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        toast(State.lang === "vi"
          ? "Đã gửi Magic Link. Vui lòng kiểm tra email."
          : "Magic Link sent. Please check your email.");
        return;
      }

      toast(State.lang === "vi"
        ? "Chưa cấu hình Magic Link trên server. Cần Worker /api/auth/magic/send."
        : "Magic Link not configured. Implement Worker /api/auth/magic/send.");
    } catch {
      toast(State.lang === "vi" ? "Không thể gửi Magic Link lúc này." : "Unable to send Magic Link right now.");
    }
  }

  // -----------------------------
  // Home bindings
  // -----------------------------
  function bindHomeActions() {
    // Copy buttons
    $$("[data-copy]").forEach((b) => {
      b.addEventListener("click", async () => {
        const txt = b.getAttribute("data-copy") || "";
        try {
          await navigator.clipboard.writeText(txt);
          toast(State.lang === "vi" ? "Đã sao chép." : "Copied.");
        } catch {
          toast(State.lang === "vi" ? "Không thể sao chép." : "Unable to copy.");
        }
      });
    });

    // Auth open
    $$('[data-auth="open"]').forEach((b) => {
      b.addEventListener("click", () => navigate(Link.login()));
    });
  }

  function bindShellActions() {
    // no-op for now
  }

  // -----------------------------
  // Topbar Button bindings
  // -----------------------------
  function bindTopbar() {
    if (UI.btnMenu) UI.btnMenu.addEventListener("click", () => toggleRail());
    if (UI.btnSearch) UI.btnSearch.addEventListener("click", () => toggleDrawer("search"));
    if (UI.btnNoti) UI.btnNoti.addEventListener("click", () => toggleDrawer("noti"));
    if (UI.btnCommand) UI.btnCommand.addEventListener("click", () => toggleModal());
    if (UI.btnTheme) UI.btnTheme.addEventListener("click", () => toggleTheme());
    if (UI.btnLang) UI.btnLang.addEventListener("click", () => toggleLang());

    // year in rail if exists
    const y = $("#y");
    if (y) y.textContent = String(new Date().getFullYear());
  }

  // -----------------------------
  // Init
  // -----------------------------
  function init() {
    resolveUI();

    // overlays prepared (stable click close)
    ensureOverlay("drawer");
    ensureOverlay("modal");

    // load user prefs
    State.lang = detectLang();
    State.theme = detectTheme();

    // bind global UX
    bindGlobalLinkInterceptor();
    bindCloseButtons();
    bindKeyboard();
    bindTopbar();

    // popstate router
    window.addEventListener("popstate", onRouteChange);

    // init theme quickly
    applyTheme(State.theme);

    // i18n load (non-fatal)
    loadI18n().finally(() => {
      applyLang(State.lang);
      onRouteChange(); // render first route
    });

    // handle first paint
    if (!prefersReducedMotion()) {
      document.documentElement.classList.add("motion");
    }
  }

  // expose navigate for debugging (optional)
  window.MuonNoi = Object.freeze({
    navigate,
    Link
  });

  // run
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
