/* apps/web/assets/ui.js
   MUON NOI — UI Controller + Router (History API, no hash)
   - Drawer/Menu/Modal stable (always closable)
   - Clean internal links (/p/:id etc.)
   - Language: EN default, VI by browser, toggle with flags
   - Theme: dark/light (simple)
   - SEO: canonical + title + og:url updates on route
   - No libs, no tracking
*/

(() => {
  "use strict";

  // -----------------------------
  // Helpers
  // -----------------------------
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  function escapeHTML(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function setText(el, txt) {
    if (el) el.textContent = String(txt ?? "");
  }

  function copyToClipboard(text) {
    const t = String(text || "");
    if (!t) return Promise.resolve(false);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(t).then(() => true).catch(() => false);
    }
    // fallback
    try {
      const ta = document.createElement("textarea");
      ta.value = t;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      return Promise.resolve(true);
    } catch {
      return Promise.resolve(false);
    }
  }

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

  function canonicalUrl(pathname, search = "") {
    const base = `${location.protocol}//${location.host}`;
    return `${base}${pathname}${search || ""}`;
  }

  // -----------------------------
  // App State
  // -----------------------------
  const State = {
    theme: "dark",          // 'dark'|'light'
    lang: "en",             // 'en'|'vi'
    i18n: null,             // optional json
    route: { path: "/", params: {}, query: {} },
    overlays: { drawer: null, modal: null }
  };

  // -----------------------------
  // Routing Map (chốt)
  // -----------------------------
  const Routes = [
    { name: "home", path: /^\/$/, view: "home" },
    { name: "explore", path: /^\/explore\/?$/, view: "explore" },
    { name: "create", path: /^\/create\/?$/, view: "create" },
    { name: "inbox", path: /^\/inbox\/?$/, view: "inbox" },
    { name: "wallet", path: /^\/wallet\/?$/, view: "wallet" },
    { name: "settings", path: /^\/settings\/?$/, view: "settings" },

    { name: "signin", path: /^\/signin\/?$/, view: "signin" },
    { name: "signup", path: /^\/signup\/?$/, view: "signup" },

    { name: "post", path: /^\/p\/([a-zA-Z0-9_\-]{6,120})\/?$/, view: "post", params: ["id"] },
    { name: "video", path: /^\/v\/([a-zA-Z0-9_\-]{6,120})\/?$/, view: "video", params: ["id"] },
    { name: "course", path: /^\/c\/([a-zA-Z0-9_\-]{6,120})\/?$/, view: "course", params: ["id"] },
    { name: "doc", path: /^\/d\/([a-zA-Z0-9_\-]{6,120})\/?$/, view: "doc", params: ["id"] },
    { name: "marketItem", path: /^\/m\/([a-zA-Z0-9_\-]{6,120})\/?$/, view: "marketItem", params: ["id"] },
    { name: "user", path: /^\/u\/([a-zA-Z0-9_\-\.]{2,80})\/?$/, view: "user", params: ["handle"] },

    { name: "docs", path: /^\/docs\/?$/, external: "https://docs.muonnoi.org/" },
    { name: "help", path: /^\/help\/?$/, external: "https://docs.muonnoi.org/" }
  ];

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
    signin: () => "/signin",
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
  // “Chain-like” ID (không phải blockchain thật)
  // -----------------------------
  function base36u32(n) { return Math.max(0, (n >>> 0)).toString(36); }

  function checksum36(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return base36u32(h >>> 0).padStart(6, "0").slice(0, 6);
  }

  function chainId(prefix = "mn") {
    const t = Date.now();
    const r = Math.floor(Math.random() * 1e9);
    const raw = `${prefix}.${t}.${r}`;
    const c = checksum36(raw);
    return `${prefix}_${base36u32(t)}_${base36u32(r)}_${c}`;
  }

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
    btnProfile: null,

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
    UI.btnProfile = $("#btnProfile") || $('[data-action="profile"]');

    UI.rail = $(".rail") || $("#rail");
    UI.drawerSearch = $("#searchDrawer") || $('.drawer[data-drawer="search"]');
    UI.drawerNoti = $("#notiDrawer") || $('.drawer[data-drawer="noti"]');

    UI.menu = $("#profileMenu") || $(".menu");
    UI.modal = $("#commandModal") || $(".modal");

    UI.view = $("#view") || $("#mainView") || $(".view") || $(".main");
    UI.pageTitle = $("#pageTitle");
    UI.pageSub = $("#pageSub");

    UI.navLinks = $$("[data-nav]");
    UI.tabbarLinks = $$("[data-tab]");
  }

  // -----------------------------
  // Hash → Path migration (kills #/home forever)
  // Must run BEFORE first render.
  // -----------------------------
  function migrateHashToPath() {
    const h = location.hash || "";
    if (!h || !h.startsWith("#/")) return;

    // #/home -> /
    let path = h.slice(1); // "/home"
    if (path === "/home") path = "/";

    // keep query string from URL (already in location.search)
    history.replaceState({}, "", path + location.search);
    try { location.hash = ""; } catch {}
  }

  // -----------------------------
  // Overlay Manager (fix “kẹt không đóng được”)
  // -----------------------------
  function ensureOverlay(kind) {
    // kind: 'drawer' | 'modal'
    const key = kind === "modal" ? "modal" : "drawer";
    const z = kind === "modal" ? 3100 : 2000;

    let el = State.overlays[key];
    if (el && el.isConnected) return el;

    el = document.createElement("div");
    el.className = "overlay";
    el.style.zIndex = String(z);
    el.hidden = true;
    el.style.display = "none";
    el.setAttribute("data-overlay", key);

    el.addEventListener("click", () => {
      if (key === "modal") closeModal();
      else closeAllDrawersAndMenus();
    });

    document.body.appendChild(el);
    State.overlays[key] = el;
    return el;
  }

  function lockScroll() { document.documentElement.style.overflow = "hidden"; }
  function unlockScrollIfSafe() {
    if (!isAnyLayerOpen()) document.documentElement.style.overflow = "";
  }

  function showOverlay(kind) {
    const el = ensureOverlay(kind);
    el.hidden = false;
    el.style.display = "block";
    lockScroll();
  }

  function hideOverlay(kind) {
    const key = kind === "modal" ? "modal" : "drawer";
    const el = State.overlays[key];
    if (!el) return;
    el.style.display = "none";
    el.hidden = true;
    unlockScrollIfSafe();
  }

  function isAnyLayerOpen() {
    return !!(
      (UI.rail && UI.rail.classList.contains("is-open")) ||
      (UI.drawerSearch && UI.drawerSearch.classList.contains("is-open")) ||
      (UI.drawerNoti && UI.drawerNoti.classList.contains("is-open")) ||
      (UI.menu && !UI.menu.hidden && UI.menu.style.display !== "none") ||
      (UI.modal && !UI.modal.hidden && UI.modal.style.display !== "none")
    );
  }

  // -----------------------------
  // Drawer/Menu/Modal
  // -----------------------------
  function closeRail() { if (UI.rail) UI.rail.classList.remove("is-open"); }
  function closeDrawers() {
    if (UI.drawerSearch) UI.drawerSearch.classList.remove("is-open");
    if (UI.drawerNoti) UI.drawerNoti.classList.remove("is-open");
  }
  function closeMenu() {
    if (!UI.menu) return;
    UI.menu.hidden = true;
    UI.menu.style.display = "none";
  }
  function closeModal() {
    if (!UI.modal) return;
    UI.modal.hidden = true;
    UI.modal.style.display = "none";
    hideOverlay("modal");
  }

  function closeAllDrawersAndMenus() {
    closeRail();
    closeDrawers();
    closeMenu();
    hideOverlay("drawer");
  }

  function openRail() {
    if (!UI.rail) return;
    closeDrawers();
    closeMenu();
    closeModal();
    UI.rail.classList.add("is-open");
    showOverlay("drawer");
  }

  function toggleRail() {
    if (!UI.rail) return;
    if (UI.rail.classList.contains("is-open")) {
      closeRail();
      // only hide overlay if no other drawer/menu open
      if (!isAnyLayerOpen()) hideOverlay("drawer");
      else hideOverlay("drawer"); // re-evaluated by state below
      if ((UI.drawerSearch && UI.drawerSearch.classList.contains("is-open")) ||
          (UI.drawerNoti && UI.drawerNoti.classList.contains("is-open")) ||
          (UI.menu && !UI.menu.hidden && UI.menu.style.display !== "none")) {
        showOverlay("drawer");
      } else {
        hideOverlay("drawer");
      }
    } else openRail();
  }

  function openDrawer(which) {
    closeRail();
    closeMenu();
    closeModal();
    closeDrawers();

    const target = (which === "search") ? UI.drawerSearch : UI.drawerNoti;
    if (!target) return;

    target.classList.add("is-open");
    showOverlay("drawer");

    if (which === "search") {
      const inp = target.querySelector("input, textarea, [contenteditable='true']");
      if (inp) setTimeout(() => inp.focus(), 60);
    }
  }

  function toggleDrawer(which) {
    const target = (which === "search") ? UI.drawerSearch : UI.drawerNoti;
    if (!target) return;

    const open = target.classList.contains("is-open");
    if (open) {
      target.classList.remove("is-open");
      if ((UI.rail && UI.rail.classList.contains("is-open")) ||
          (UI.drawerSearch && UI.drawerSearch.classList.contains("is-open")) ||
          (UI.drawerNoti && UI.drawerNoti.classList.contains("is-open")) ||
          (UI.menu && !UI.menu.hidden && UI.menu.style.display !== "none")) {
        showOverlay("drawer");
      } else {
        hideOverlay("drawer");
      }
    } else openDrawer(which);
  }

  function openMenu() {
    if (!UI.menu) return;
    closeRail();
    closeDrawers();
    closeModal();
    UI.menu.hidden = false;
    UI.menu.style.display = "block";
    showOverlay("drawer");
  }

  function toggleMenu() {
    if (!UI.menu) return;
    const open = (!UI.menu.hidden && UI.menu.style.display !== "none");
    if (open) {
      closeMenu();
      if (!isAnyLayerOpen()) hideOverlay("drawer");
    } else openMenu();
  }

  function openModal() {
    if (!UI.modal) return;
    closeRail();
    closeDrawers();
    closeMenu();
    UI.modal.hidden = false;
    UI.modal.style.display = "flex";
    showOverlay("modal");
    const inp = UI.modal.querySelector("input, textarea, [contenteditable='true']");
    if (inp) setTimeout(() => inp.focus(), 60);
  }

  function toggleModal() {
    if (!UI.modal) return;
    const open = (!UI.modal.hidden && UI.modal.style.display !== "none");
    if (open) closeModal();
    else openModal();
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
    // EN default, VI if browser vi
    return nav.startsWith("vi") ? "vi" : "en";
  }

  function detectTheme() {
    try {
      const saved = localStorage.getItem("mn_theme");
      if (saved === "dark" || saved === "light") return saved;
    } catch {}
    return "dark";
  }

  async function loadI18nOptional() {
    try {
      const res = await fetch("/assets/i18n.json", { cache: "no-store" });
      if (!res.ok) return;
      State.i18n = await res.json();
    } catch {}
  }

  function t(key, fallback) {
    const L = State.lang;
    const v = State.i18n && State.i18n[L] && State.i18n[L][key];
    return v || fallback || key;
  }

  function applyLang(lang) {
    State.lang = (lang === "vi") ? "vi" : "en";
    try { localStorage.setItem("mn_lang", State.lang); } catch {}
    document.documentElement.lang = State.lang;

    const langCode = $("#langCode");
    const flagA = $("#flagA");
    const flagB = $("#flagB");
    if (langCode) langCode.textContent = State.lang.toUpperCase();
    if (flagA) flagA.textContent = "🇺🇸";
    if (flagB) flagB.textContent = "🇻🇳";

    $$("[data-i18n]").forEach((el) => {
      const k = el.getAttribute("data-i18n");
      if (!k) return;
      el.textContent = t(k, el.textContent);
    });

    onRouteChange({ replace: true, rerender: true });
  }

  function toggleLang() {
    applyLang(State.lang === "en" ? "vi" : "en");
  }

  function applyTheme(theme) {
    State.theme = (theme === "light") ? "light" : "dark";
    try { localStorage.setItem("mn_theme", State.theme); } catch {}
    (UI.app || document.body).setAttribute("data-theme", State.theme);

    const themeIconUse = $("#themeIconUse");
    if (themeIconUse) {
      themeIconUse.setAttribute("href", State.theme === "dark" ? "#i-sun" : "#i-moon");
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

    const purePath = String(path).split("?")[0];
    const matched = matchRoute(purePath);
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

  function onRouteChange(opts = {}) {
    const pathname = location.pathname || "/";
    const search = location.search || "";
    const query = parseQuery(search);

    const r = matchRoute(pathname);
    State.route = { path: pathname, params: r.params || {}, query };

    // SEO canonical
    let can = $('link[rel="canonical"]');
    if (!can) {
      can = document.createElement("link");
      can.rel = "canonical";
      document.head.appendChild(can);
    }
    can.href = canonicalUrl(pathname, search);

    // OG url update
    const ogUrl = $('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute("content", can.href);

    // Title update
    document.title = seoTitle(r.view, r.params);

    renderRoute(pathname, r.params || {}, query);
    setActiveNav(pathname);

    if (opts.replace && !opts.rerender) return;
  }

  function setActiveNav(pathname) {
    const setActive = (el, active) => {
      if (!el) return;
      if (active) el.classList.add("is-active");
      else el.classList.remove("is-active");
    };

    UI.navLinks.forEach((a) => {
      const target = a.getAttribute("data-nav") || a.getAttribute("href") || "";
      const p = (target.startsWith("http")) ? null : target.split("?")[0];
      if (!p) return;
      setActive(a, p === pathname);
    });

    UI.tabbarLinks.forEach((a) => {
      const target = a.getAttribute("data-tab") || a.getAttribute("href") || "";
      const p = (target.startsWith("http")) ? null : target.split("?")[0];
      if (!p) return;
      setActive(a, p === pathname);
    });
  }

  // Intercept <a href="/..."> to prevent full reload
  function isInternalHref(href) {
    if (!href) return false;
    if (href.startsWith("#")) return false;
    if (href.startsWith("mailto:") || href.startsWith("tel:")) return false;
    if (href.startsWith("http://") || href.startsWith("https://")) {
      try {
        const u = new URL(href);
        return u.origin === location.origin;
      } catch { return false; }
    }
    return href.startsWith("/");
  }

  function bindGlobalLinkInterceptor() {
    document.addEventListener("click", (e) => {
      const a = e.target && e.target.closest ? e.target.closest("a") : null;
      if (!a) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const href = a.getAttribute("href");
      if (!isInternalHref(href)) return;
      if (a.hasAttribute("download")) return;

      e.preventDefault();
      navigate(href);
    }, { passive: false });
  }

  // Bind all elements with data-route (buttons/divs)
  function bindDataRouteClicks(root = document) {
    $$("[data-route]", root).forEach((el) => {
      if (el.__mnBound) return;
      el.__mnBound = true;
      el.addEventListener("click", (e) => {
        e.preventDefault();
        const p = el.getAttribute("data-route") || "";
        if (!p) return;
        navigate(p);
      });
    });
  }

  // -----------------------------
  // Views
  // -----------------------------
  function seoTitle(view, params) {
    const L = State.lang;
    const base = "Muon Noi";
    const map = {
      home: L === "vi" ? "Muon Noi. Không Gian Vận Hành Xã Hội" : "Muon Noi. Social Operating Space",
      explore: L === "vi" ? "Khám Phá. Muon Noi" : "Explore. Muon Noi",
      create: L === "vi" ? "Tạo. Muon Noi" : "Create. Muon Noi",
      inbox: L === "vi" ? "Tin Nhắn. Muon Noi" : "Inbox. Muon Noi",
      wallet: L === "vi" ? "Ví. Muon Noi" : "Wallet. Muon Noi",
      settings: L === "vi" ? "Cài Đặt. Muon Noi" : "Settings. Muon Noi",
      signin: L === "vi" ? "Đăng Nhập. Muon Noi" : "Sign In. Muon Noi",
      signup: L === "vi" ? "Đăng Ký. Muon Noi" : "Sign Up. Muon Noi"
    };
    if (view === "post") return `${base}. ${L === "vi" ? "Bài" : "Post"} ${params?.id ? params.id : ""}`.trim();
    if (view === "user") return `${base}. ${L === "vi" ? "Hồ Sơ" : "Profile"} ${params?.handle ? params.handle : ""}`.trim();
    return map[view] || map.home;
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
        case "signin": return "Đăng Nhập";
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
      case "signin": return "Sign In";
      case "signup": return "Sign Up";
      case "post": return "Post";
      case "user": return "Profile";
      default: return "Muon Noi";
    }
  }

  function pageSubFor(view) {
    const L = State.lang;
    if (L === "vi") {
      if (view === "home") return "Không phải bảng tin. Là không gian vận hành. Làm việc, mua bán, học, live, nhắn tin, thanh toán.";
      if (view === "signin") return "Đăng nhập nhanh. Không theo dõi. Bảo mật.";
      if (view === "signup") return "Tạo tài khoản với quyền riêng tư là mặc định.";
      return "Module đang hoàn thiện theo lộ trình.";
    }
    if (view === "home") return "Not a feed. A social operating space. Work, market, learn, live, message, pay.";
    if (view === "signin") return "Fast sign-in. No tracking. Secure.";
    if (view === "signup") return "Create an account with privacy by default.";
    return "Module is being finalized per roadmap.";
  }

  function renderRoute(pathname, params, query) {
    if (!UI.view) return;

    const matched = matchRoute(pathname);
    const view = matched.view || "home";

    if (UI.pageTitle) setText(UI.pageTitle, pageTitleFor(view, params));
    if (UI.pageSub) setText(UI.pageSub, pageSubFor(view));

    if (view === "home") {
      UI.view.innerHTML = homeHTML();
      bindDataRouteClicks(UI.view);
      bindHomeActions();
      return;
    }
        if (view === "signin") {
      UI.view.innerHTML = signinHTML();
      bindDataRouteClicks(UI.view);
      bindAuthActions("signin");
      return;
    }
    if (view === "signup") {
      UI.view.innerHTML = signupHTML();
      bindDataRouteClicks(UI.view);
      bindAuthActions("signup");
      return;
    }

    // shells
    UI.view.innerHTML = shellHTML(view, params);
    bindDataRouteClicks(UI.view);
    bindShellActions(view, params);
  }

  // Bind click for any element having data-route (buttons/divs)
  function bindDataRouteClicks(rootEl = document) {
    const nodes = rootEl.querySelectorAll("[data-route]");
    nodes.forEach((el) => {
      if (el.__mnBound) return;
      el.__mnBound = true;
      el.addEventListener("click", (e) => {
        e.preventDefault();
        const to = el.getAttribute("data-route");
        if (!to) return;
        navigate(to);
      });
    });
  }

  function shellHTML(view, params) {
    const title = pageTitleFor(view, params);
    const L = State.lang;

    const hint = (L === "vi")
      ? "Module này đang ở trạng thái khung. Bạn có thể quay lại Trang Chủ hoặc mở Docs."
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
            <button class="btn btn--ghost" type="button" data-route="${Link.home()}">${escapeHTML(back)}</button>
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
    const rows = keys.map(k => `
      <div class="status__row">
        <span class="muted">${escapeHTML(k)}</span>
        <span class="pillInline">${escapeHTML(params[k])}</span>
      </div>`).join("");
    return `<div class="status" style="margin-top:14px">${rows}</div>`;
  }

  // -----------------------------
  // HOME
  // -----------------------------
  function homeHTML() {
    const L = State.lang;

    const kicker = "Social Operating Space";
    const title = "Muon Noi";

    const lead = (L === "vi")
      ? "Một Không Gian Vận Hành Xã Hội Tất Cả Trong Một. Làm Việc, Kiếm Tiền, Mua Bán, Kinh Doanh, Học, Video, Livestream, Nhắn Tin, Gọi, Thanh Toán."
      : "An all-in-one Social Operating Space. Work, earn, trade, business, learn, video, livestream, message, call, pay.";

    const ctaA = (L === "vi") ? "Bắt Đầu Tạo" : "Start Creating";
    const ctaB = (L === "vi") ? "Khám Phá" : "Explore";
    const ctaC = (L === "vi") ? "Đăng Nhập" : "Sign In";

    const privacyTitle = (L === "vi") ? "Bảo Mật Và Quyền Riêng Tư" : "Privacy & Security";
    const privacyText = (L === "vi")
      ? "Không thu thập dữ liệu hành vi. Không pixel theo dõi. Liên kết sạch. Thiết kế hướng tới mã hóa đầu cuối cho liên lạc, giao dịch và dữ liệu cá nhân."
      : "No behavioral tracking. No pixels. Clean links. Designed toward end-to-end encryption for communication, transactions, and personal data.";

    const privacyPoints = (L === "vi")
      ? ["Không bán dữ liệu người dùng", "Không SDK bên thứ ba", "Không quảng cáo hành vi", "Kiến trúc hướng Web3 tương lai"]
      : ["No user data selling", "No third-party SDKs", "No behavioral ads", "Web3-ready architecture"];

    const sample = chainId("mn");
    const samplePost = canonicalUrl(Link.post(sample));

    const sampleLabel = (L === "vi") ? "Link Chia Sẻ Mẫu (Sạch, Không #)" : "Sample Share Link (Clean, No #)";
    const copy = (L === "vi") ? "Sao Chép" : "Copy";
    const open = (L === "vi") ? "Mở" : "Open";

    return `
      <section class="hero">
        <div>
          <span class="kicker">${escapeHTML(kicker)}</span>
          <h1>${escapeHTML(title)}</h1>
          <p class="lead">${escapeHTML(lead)}</p>

          <div class="hero__actions">
            <button class="btn btn--primary" type="button" data-route="/create">
              <svg class="icon" aria-hidden="true"><use href="#i-rocket"></use></svg>
              <span>${escapeHTML(ctaA)}</span>
            </button>

            <button class="btn btn--ghost" type="button" data-route="/explore">
              <svg class="icon" aria-hidden="true"><use href="#i-compass"></use></svg>
              <span>${escapeHTML(ctaB)}</span>
            </button>

            <button class="btn btn--ghost" type="button" data-route="/signin">
              <svg class="icon" aria-hidden="true"><use href="#i-key"></use></svg>
              <span>${escapeHTML(ctaC)}</span>
            </button>
          </div>

          <div class="hero__chips">
            <span class="chip">${escapeHTML(L === "vi" ? "Làm Việc" : "Work")}</span>
            <span class="chip">${escapeHTML(L === "vi" ? "Mua Bán" : "Commerce")}</span>
            <span class="chip">${escapeHTML(L === "vi" ? "Video" : "Media")}</span>
            <span class="chip">${escapeHTML(L === "vi" ? "Khóa Học" : "Courses")}</span>
            <span class="chip">${escapeHTML(L === "vi" ? "Thanh Toán" : "Payments")}</span>
          </div>

          <div class="heroSample" style="margin-top:16px">
            <div class="heroSample__label">${escapeHTML(sampleLabel)}</div>
            <code class="code" id="sampleLink">${escapeHTML(samplePost)}</code>
            <div class="heroSample__actions">
              <button class="btn btn--ghost" type="button" id="btnCopySample">
                <svg class="icon" aria-hidden="true"><use href="#i-copy"></use></svg>
                <span>${escapeHTML(copy)}</span>
              </button>
              <button class="btn btn--primary" type="button" id="btnOpenSample">
                <svg class="icon" aria-hidden="true"><use href="#i-external"></use></svg>
                <span>${escapeHTML(open)}</span>
              </button>
            </div>
          </div>
        </div>

        <div class="hero__visual">
          <div class="heroCard">
            <div class="heroCard__top">
              <div class="dots">
                <span class="dot dot--g"></span>
                <span class="dot dot--y"></span>
                <span class="dot dot--r"></span>
              </div>
              <span class="heroCard__tag">muonnoi</span>
            </div>
            <div class="heroCard__body">
              <h3>${escapeHTML(privacyTitle)}</h3>
              <p>${escapeHTML(privacyText)}</p>

              <div class="heroSample">
                <div class="heroSample__label">${escapeHTML(L === "vi" ? "Nguyên Tắc Nền Tảng" : "Core Principles")}</div>
                <div class="code">
                  ${privacyPoints.map(p => `• ${escapeHTML(p)}`).join("<br/>")}
                </div>
              </div>

              <div class="heroSample" style="margin-top:12px">
                <div class="heroSample__label">${escapeHTML(L === "vi" ? "Điều Hướng" : "Routing")}</div>
                <div class="code">
                  • ${escapeHTML("/p/:id")}<br/>
                  • ${escapeHTML("/u/:handle")}<br/>
                  • ${escapeHTML("/v/:id")}<br/>
                  • ${escapeHTML("/m/:id")}<br/>
                  • ${escapeHTML("/docs → docs.muonnoi.org")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="grid3">
        <div class="panel">
          <div class="panel__head">
            <div class="panel__titleRow">
              <svg class="icon" aria-hidden="true"><use href="#i-work"></use></svg>
              <span class="h2">${escapeHTML(L === "vi" ? "Làm Việc & Kiếm Tiền" : "Work & Earn")}</span>
            </div>
            <div class="panel__headActions">
              <button class="btn btn--ghost" type="button" data-route="/explore">${escapeHTML(L === "vi" ? "Xem" : "View")}</button>
            </div>
          </div>
          <div class="panel__block hint">
            ${escapeHTML(L === "vi"
              ? "Hồ sơ năng lực. Dự án. Hợp tác. Thanh toán trực tuyến và ngoại tuyến."
              : "Profiles. Projects. Collaboration. Online and offline payments.")}
          </div>
        </div>

        <div class="panel">
          <div class="panel__head">
            <div class="panel__titleRow">
              <svg class="icon" aria-hidden="true"><use href="#i-video"></use></svg>
              <span class="h2">${escapeHTML(L === "vi" ? "Video & Livestream" : "Video & Livestream")}</span>
            </div>
            <div class="panel__headActions">
              <button class="btn btn--ghost" type="button" data-route="/create">${escapeHTML(L === "vi" ? "Tạo" : "Create")}</button>
            </div>
          </div>
          <div class="panel__block hint">
            ${escapeHTML(L === "vi"
              ? "Chia sẻ video. Phát trực tiếp. Tài liệu và khóa học."
              : "Share videos. Go live. Publish documents and courses.")}
          </div>
        </div>

        <div class="panel">
          <div class="panel__head">
            <div class="panel__titleRow">
              <svg class="icon" aria-hidden="true"><use href="#i-lock"></use></svg>
              <span class="h2">${escapeHTML(L === "vi" ? "Bảo Mật Cao Nhất" : "High Security")}</span>
            </div>
            <div class="panel__headActions">
              <button class="btn btn--ghost" type="button" data-route="/settings">${escapeHTML(L === "vi" ? "Cài Đặt" : "Settings")}</button>
            </div>
          </div>
          <div class="panel__block hint">
            ${escapeHTML(L === "vi"
              ? "Thiết kế không theo dõi. Kiến trúc mã hóa. Quyền riêng tư là mặc định."
              : "No tracking by design. Encryption-ready architecture. Privacy by default.")}
          </div>
        </div>
      </section>
    `;
  }

  function bindHomeActions() {
    bindDataRouteClicks(UI.view);

    const btnCopy = $("#btnCopySample");
    const btnOpen = $("#btnOpenSample");
    const code = $("#sampleLink");
    if (btnCopy && code) {
      btnCopy.addEventListener("click", async () => {
        const ok = await copyToClipboard(code.textContent || "");
        btnCopy.blur();
        const span = btnCopy.querySelector("span");
        if (span) {
          span.textContent = State.lang === "vi"
            ? (ok ? "Đã Sao Chép" : "Không Sao Chép Được")
            : (ok ? "Copied" : "Copy Failed");
          setTimeout(() => { span.textContent = State.lang === "vi" ? "Sao Chép" : "Copy"; }, 1200);
        }
      });
    }
    if (btnOpen && code) {
      btnOpen.addEventListener("click", () => {
        const href = code.textContent || "";
        try {
          const u = new URL(href);
          navigate(u.pathname);
        } catch {}
      });
    }
  }

  // -----------------------------
  // Auth Views (UI Stub now)
  // -----------------------------
  function signinHTML() {
    const L = State.lang;
    const title = L === "vi" ? "Đăng Nhập" : "Sign In";
    const hint = L === "vi"
      ? "Chưa bật backend. Đây là khung UI để gắn Worker sau. Google Magic Link và OAuth sẽ bật ở api.muonnoi.org."
      : "Backend not enabled yet. This is a UI shell to connect Worker later. Google Magic Link and OAuth will run on api.muonnoi.org.";

    return `
      <section class="panel" style="margin-top:16px">
        <div class="panel__head">
          <div class="panel__titleRow">
            <svg class="icon" aria-hidden="true"><use href="#i-key"></use></svg>
            <span class="h2">${escapeHTML(title)}</span>
          </div>
          <div class="panel__headActions">
            <button class="btn btn--ghost" type="button" data-route="/signup">${escapeHTML(L === "vi" ? "Tạo Tài Khoản" : "Create Account")}</button>
          </div>
        </div>
        <div class="panel__block">
          <div class="hint">${escapeHTML(hint)}</div>

          <div style="margin-top:14px; display:grid; gap:10px; max-width:560px">
            <label>
              <div class="tiny muted">${escapeHTML(L === "vi" ? "Email" : "Email")}</div>
              <input class="input" id="authEmail" type="email" placeholder="you@domain.com" autocomplete="email" />
            </label>

            <button class="btn btn--primary w100" type="button" id="btnMagicLink">
              <svg class="icon" aria-hidden="true"><use href="#i-mail"></use></svg>
              <span>${escapeHTML(L === "vi" ? "Gửi Magic Link" : "Send Magic Link")}</span>
            </button>

            <button class="btn btn--ghost w100" type="button" id="btnGoogleSignIn">
              <svg class="icon" aria-hidden="true"><use href="#i-google"></use></svg>
              <span>${escapeHTML(L === "vi" ? "Đăng Nhập Với Google" : "Continue with Google")}</span>
            </button>

            <div class="tiny muted">
              ${escapeHTML(L === "vi"
                ? "Bằng cách đăng nhập, bạn đồng ý với Điều khoản và Quyền riêng tư."
                : "By signing in, you agree to Terms and Privacy.")}
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function signupHTML() {
    const L = State.lang;
    const title = L === "vi" ? "Đăng Ký" : "Sign Up";
    const hint = L === "vi"
      ? "Khung UI tạo tài khoản. Backend sẽ bật sau. Mục tiêu: không thu thập dữ liệu hành vi."
      : "Account creation UI shell. Backend later. Goal: no behavioral data harvesting.";

    return `
      <section class="panel" style="margin-top:16px">
        <div class="panel__head">
          <div class="panel__titleRow">
            <svg class="icon" aria-hidden="true"><use href="#i-plus"></use></svg>
            <span class="h2">${escapeHTML(title)}</span>
          </div>
          <div class="panel__headActions">
            <button class="btn btn--ghost" type="button" data-route="/signin">${escapeHTML(L === "vi" ? "Đã Có Tài Khoản" : "Have an account")}</button>
          </div>
        </div>
        <div class="panel__block">
          <div class="hint">${escapeHTML(hint)}</div>

          <div style="margin-top:14px; display:grid; gap:10px; max-width:560px">
            <label>
              <div class="tiny muted">${escapeHTML(L === "vi" ? "Tên Hiển Thị" : "Display Name")}</div>
              <input class="input" id="displayName" type="text" placeholder="${escapeHTML(L === "vi" ? "Tên của bạn" : "Your name")}" autocomplete="name" />
            </label>

            <label>
              <div class="tiny muted">${escapeHTML(L === "vi" ? "Email" : "Email")}</div>
              <input class="input" id="signupEmail" type="email" placeholder="you@domain.com" autocomplete="email" />
            </label>

            <button class="btn btn--primary w100" type="button" id="btnCreateAccount">
              <svg class="icon" aria-hidden="true"><use href="#i-rocket"></use></svg>
              <span>${escapeHTML(L === "vi" ? "Tạo Tài Khoản" : "Create Account")}</span>
            </button>

            <button class="btn btn--ghost w100" type="button" id="btnGoogleSignUp">
              <svg class="icon" aria-hidden="true"><use href="#i-google"></use></svg>
              <span>${escapeHTML(L === "vi" ? "Đăng Ký Với Google" : "Sign up with Google")}</span>
            </button>
          </div>
        </div>
      </section>
    `;
  }

  function bindAuthActions(mode) {
    const L = State.lang;

    const btnMagic = $("#btnMagicLink");
    if (btnMagic) {
      btnMagic.addEventListener("click", () => {
        const email = ($("#authEmail")?.value || $("#signupEmail")?.value || "").trim();
        if (!email) {
          alert(L === "vi" ? "Vui lòng nhập email." : "Please enter your email.");
          return;
        }
        alert(L === "vi"
          ? "UI đã sẵn. Bước tiếp theo: kết nối Worker để gửi Magic Link qua email."
          : "UI ready. Next: connect Worker to send Magic Link email.");
      });
    }

    const btnGoogle = $("#btnGoogleSignIn") || $("#btnGoogleSignUp");
    if (btnGoogle) {
      btnGoogle.addEventListener("click", () => {
        alert(L === "vi"
          ? "UI đã sẵn. Bước tiếp theo: bật Google OAuth trên Worker."
          : "UI ready. Next: enable Google OAuth on Worker.");
      });
    }

    const btnCreate = $("#btnCreateAccount");
    if (btnCreate) {
      btnCreate.addEventListener("click", () => {
        alert(L === "vi"
          ? "UI đã sẵn. Bước tiếp theo: tạo endpoint /auth/signup trên Worker."
          : "UI ready. Next: add /auth/signup endpoint on Worker.");
      });
    }
  }

  function bindShellActions(view, params) {
    // reserve
  }

  // -----------------------------
  // Global bindings (close on ESC etc.)
  // -----------------------------
  function bindControls() {
    UI.btnMenu && UI.btnMenu.addEventListener("click", toggleRail);
    UI.btnSearch && UI.btnSearch.addEventListener("click", () => toggleDrawer("search"));
    UI.btnNoti && UI.btnNoti.addEventListener("click", () => toggleDrawer("noti"));
    UI.btnCommand && UI.btnCommand.addEventListener("click", toggleModal);
    UI.btnTheme && UI.btnTheme.addEventListener("click", toggleTheme);
    UI.btnLang && UI.btnLang.addEventListener("click", toggleLang);
    UI.btnProfile && UI.btnProfile.addEventListener("click", toggleMenu);

    document.addEventListener("click", (e) => {
      const closeBtn = e.target && e.target.closest ? e.target.closest("[data-close]") : null;
      if (!closeBtn) return;
      const kind = closeBtn.getAttribute("data-close");
      if (kind === "modal") closeModal();
      else closeAllDrawersAndMenus();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeModal();
        closeAllDrawersAndMenus();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "k")) {
        e.preventDefault();
        toggleDrawer("search");
      }
    });

    window.addEventListener("popstate", () => onRouteChange());
  }

  // -----------------------------
  // Hash → Path migration (kills #/home forever)
  // -----------------------------
  function migrateHashToPath() {
    const h = location.hash || "";
    if (!h.startsWith("#/")) return;

    let path = h.slice(1); // "/home" etc.
    if (path === "/home") path = "/";
    if (!path.startsWith("/")) path = "/";

    // keep search
    history.replaceState({}, "", path + location.search);
    try { location.hash = ""; } catch {}
  }

  // -----------------------------
  // Init
  // -----------------------------
  async function init() {
    migrateHashToPath();

    resolveUI();
    ensureOverlay("drawer");
    ensureOverlay("modal");

    await loadI18nOptional();

    applyTheme(detectTheme());
    applyLang(detectLang());

    bindGlobalLinkInterceptor();
    bindControls();

    onRouteChange({ replace: true });

    // Important: after first render, bind data-route clicks inside view
    bindDataRouteClicks(document);

    window.MN = { navigate, Link, chainId, get state() { return State; } };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

})();
