/* apps/web/assets/ui.js
   MUON NOI — UI Controller + Router (History API, no hash)
   - Stable overlays/drawers/modals (no stuck)
   - Clean internal links (/p/:id etc.)
   - Language: EN default, VI by browser, toggle with flags
   - Theme: dark/light + persist
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

  function safeJSONParse(s, fallback = null) {
    try { return JSON.parse(s); } catch { return fallback; }
  }

  function escapeHTML(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setText(el, txt) { if (el) el.textContent = txt; }

  function parseQuery(search) {
    const q = {};
    const s = (search || "").replace(/^\?/, "");
    if (!s) return q;
    for (const part of s.split("&")) {
      if (!part) continue;
      const i = part.indexOf("=");
      const k = i >= 0 ? part.slice(0, i) : part;
      const v = i >= 0 ? part.slice(i + 1) : "";
      const key = decodeURIComponent(k || "").trim();
      if (!key) continue;
      q[key] = decodeURIComponent(v || "").trim();
    }
    return q;
  }

  function qs(obj = {}) {
    const parts = [];
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (v === undefined || v === null || v === "") continue;
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    }
    return parts.length ? `?${parts.join("&")}` : "";
  }

  // base = current host (app.muonnoi.org)
  function canonicalUrl(pathname, search = "") {
    const base = `${location.protocol}//${location.host}`;
    return `${base}${pathname}${search || ""}`;
  }

  function isInternalLink(a) {
    if (!a || !a.getAttribute) return false;
    const href = a.getAttribute("href") || "";
    if (!href) return false;
    if (href.startsWith("mailto:") || href.startsWith("tel:")) return false;
    if (href.startsWith("javascript:")) return false;
    if (a.hasAttribute("download")) return false;
    const target = (a.getAttribute("target") || "").toLowerCase();
    if (target === "_blank") return false;
    // absolute external
    if (/^https?:\/\//i.test(href)) {
      try {
        const u = new URL(href);
        return u.origin === location.origin;
      } catch {
        return false;
      }
    }
    // relative internal
    return href.startsWith("/") || href.startsWith("./") || href.startsWith("../") || href.startsWith("?");
  }

  function normalizePath(href) {
    // href can be "/x", "./x", "?q=1"
    try {
      const u = new URL(href, location.origin);
      return u.pathname + u.search;
    } catch {
      return "/";
    }
  }

  // -----------------------------
  // IDs / "Chain-like" link ids
  // (UI-only now; real blockchain later)
  // -----------------------------
  function randomId(len = 18) {
    const bytes = new Uint8Array(len);
    crypto.getRandomValues(bytes);
    const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
    let out = "";
    for (let i = 0; i < bytes.length; i++) out += alphabet[bytes[i] % alphabet.length];
    return out;
  }

  function sampleChainId() {
    // "mn_" prefix makes it recognizable in logs & later verifiable receipts
    return `mn_${randomId(20)}`;
  }

  // -----------------------------
  // App State
  // -----------------------------
  const State = {
    theme: "dark",
    lang: "en",
    i18n: null,
    route: { path: "/", params: {}, query: {} },
    overlays: {
      drawer: null,
      modal: null
    },
    scrollLockCount: 0
  };

  // -----------------------------
  // Routing Map (chốt)
  // -----------------------------
  const Routes = [
    { name: "home",     path: /^\/$/,                     view: "home" },
    { name: "explore",  path: /^\/explore\/?$/,           view: "explore" },
    { name: "create",   path: /^\/create\/?$/,            view: "create" },
    { name: "inbox",    path: /^\/inbox\/?$/,             view: "inbox" },
    { name: "wallet",   path: /^\/wallet\/?$/,            view: "wallet" },
    { name: "settings", path: /^\/settings\/?$/,          view: "settings" },
    { name: "signin",   path: /^\/signin\/?$/,            view: "signin" },
    { name: "signup",   path: /^\/signup\/?$/,            view: "signup" },

    { name: "post",     path: /^\/p\/([a-zA-Z0-9_\-]{6,120})\/?$/, view: "post",   params: ["id"] },
    { name: "video",    path: /^\/v\/([a-zA-Z0-9_\-]{6,120})\/?$/, view: "video",  params: ["id"] },
    { name: "course",   path: /^\/c\/([a-zA-Z0-9_\-]{6,120})\/?$/, view: "course", params: ["id"] },
    { name: "doc",      path: /^\/d\/([a-zA-Z0-9_\-]{6,120})\/?$/, view: "doc",    params: ["id"] },
    { name: "market",   path: /^\/m\/([a-zA-Z0-9_\-]{6,120})\/?$/, view: "market", params: ["id"] },
    { name: "user",     path: /^\/u\/([a-zA-Z0-9_\-\.]{2,80})\/?$/,view: "user",   params: ["handle"] },

    // external docs shortcut
    { name: "docs",     path: /^\/docs\/?$/, external: "https://docs.muonnoi.org/" },
    { name: "help",     path: /^\/help\/?$/, external: "https://docs.muonnoi.org/" }
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

  // Single source of internal link generator
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
  // DOM Handles
  // (index.html phải có đúng id/class này để không lỗi)
  // -----------------------------
  const UI = {
    app: null,

    // top actions
    btnMenu: null,
    btnSearch: null,
    btnNoti: null,
    btnCommand: null,
    btnTheme: null,
    btnLang: null,
    btnProfile: null,

    // layers
    rail: null,
    drawerSearch: null,
    drawerNoti: null,
    profileMenu: null,
    commandModal: null,

    // page
    view: null,
    pageTitle: null,
    pageSub: null,

    // dynamic lists
    navLinks: [],
    tabLinks: []
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

    UI.rail = $("#rail") || $(".rail");
    UI.drawerSearch = $("#searchDrawer") || $('.drawer[data-drawer="search"]');
    UI.drawerNoti = $("#notiDrawer") || $('.drawer[data-drawer="noti"]');
    UI.profileMenu = $("#profileMenu") || $(".menu");
    UI.commandModal = $("#commandModal") || $(".modal");

    UI.view = $("#view") || $(".view") || $("#mainView") || $(".main");
    UI.pageTitle = $("#pageTitle");
    UI.pageSub = $("#pageSub");

    UI.navLinks = $$("[data-nav]");
    UI.tabLinks = $$("[data-tab]");
  }

  // -----------------------------
  // Overlay + Scroll Lock (never stuck)
  // -----------------------------
  function lockScroll() {
    State.scrollLockCount = Math.max(0, State.scrollLockCount + 1);
    document.documentElement.style.overflow = "hidden";
  }
  function unlockScrollIfSafe() {
    State.scrollLockCount = Math.max(0, State.scrollLockCount - 1);
    if (State.scrollLockCount === 0) {
      document.documentElement.style.overflow = "";
    }
  }

  function ensureOverlay(kind) {
    // kind: "drawer" | "modal"
    const key = kind;
    let el = State.overlays[key];
    if (el && el.isConnected) return el;

    el = document.createElement("div");
    el.className = "overlay";
    el.hidden = true;
    el.style.display = "none";
    el.setAttribute("data-overlay", kind);

    // correct z-index stacking
    el.style.zIndex = (kind === "modal") ? "3100" : "2000";

    el.addEventListener("click", () => {
      if (kind === "modal") closeModal();
      else closeAllDrawersAndMenus();
    });

    document.body.appendChild(el);
    State.overlays[key] = el;
    return el;
  }

  function showOverlay(kind) {
    const el = ensureOverlay(kind);
    el.hidden = false;
    el.style.display = "block";
    lockScroll();
  }

  function hideOverlay(kind) {
    const el = State.overlays[kind];
    if (!el) return;
    el.style.display = "none";
    el.hidden = true;
    unlockScrollIfSafe();
  }

  function isAnyDrawerOpen() {
    return !!(
      (UI.rail && UI.rail.classList.contains("is-open")) ||
      (UI.drawerSearch && UI.drawerSearch.classList.contains("is-open")) ||
      (UI.drawerNoti && UI.drawerNoti.classList.contains("is-open")) ||
      (UI.profileMenu && !UI.profileMenu.hidden && UI.profileMenu.style.display !== "none")
    );
  }

  function isModalOpen() {
    return !!(UI.commandModal && !UI.commandModal.hidden && UI.commandModal.style.display !== "none");
  }

  // -----------------------------
  // Drawer / Menu / Modal Controls
  // -----------------------------
  function closeRail() {
    if (UI.rail) UI.rail.classList.remove("is-open");
  }
  function openRail() {
    if (!UI.rail) return;
    closeDrawers();
    closeProfileMenu();
    closeModal();
    UI.rail.classList.add("is-open");
    showOverlay("drawer");
  }
  function toggleRail() {
    if (!UI.rail) return;
    if (UI.rail.classList.contains("is-open")) {
      closeRail();
      if (!isAnyDrawerOpen()) hideOverlay("drawer");
    } else openRail();
  }

  function closeDrawers() {
    if (UI.drawerSearch) UI.drawerSearch.classList.remove("is-open");
    if (UI.drawerNoti) UI.drawerNoti.classList.remove("is-open");
  }

  function openDrawer(which) {
    closeRail();
    closeProfileMenu();
    closeModal();

    // close other drawers
    [UI.drawerSearch, UI.drawerNoti].filter(Boolean).forEach(d => d.classList.remove("is-open"));

    const target = (which === "search") ? UI.drawerSearch : UI.drawerNoti;
    if (!target) return;

    target.classList.add("is-open");
    showOverlay("drawer");

    if (which === "search") {
      const inp = target.querySelector("input, textarea, [contenteditable='true']");
      if (inp) setTimeout(() => inp.focus(), 40);
    }
  }

  function toggleDrawer(which) {
    const target = (which === "search") ? UI.drawerSearch : UI.drawerNoti;
    if (!target) return;
    if (target.classList.contains("is-open")) {
      target.classList.remove("is-open");
      // keep overlay only if some drawer still open
      if (!isAnyDrawerOpen()) hideOverlay("drawer");
    } else openDrawer(which);
  }

  function openProfileMenu() {
    if (!UI.profileMenu) return;
    closeRail();
    closeDrawers();
    closeModal();
    UI.profileMenu.hidden = false;
    UI.profileMenu.style.display = "block";
    showOverlay("drawer");
  }

  function closeProfileMenu() {
    if (!UI.profileMenu) return;
    UI.profileMenu.hidden = true;
    UI.profileMenu.style.display = "none";
  }

  function toggleProfileMenu() {
    if (!UI.profileMenu) return;
    const open = (!UI.profileMenu.hidden && UI.profileMenu.style.display !== "none");
    if (open) {
      closeProfileMenu();
      if (!isAnyDrawerOpen()) hideOverlay("drawer");
    } else openProfileMenu();
  }

  function openModal() {
    if (!UI.commandModal) return;
    closeRail();
    closeDrawers();
    closeProfileMenu();

    UI.commandModal.hidden = false;
    UI.commandModal.style.display = "flex";
    showOverlay("modal");

    const inp = UI.commandModal.querySelector("input, textarea, [contenteditable='true']");
    if (inp) setTimeout(() => inp.focus(), 40);
  }

  function closeModal() {
    if (!UI.commandModal) return;
    UI.commandModal.hidden = true;
    UI.commandModal.style.display = "none";
    hideOverlay("modal");
  }

  function toggleModal() {
    if (!UI.commandModal) return;
    const open = (!UI.commandModal.hidden && UI.commandModal.style.display !== "none");
    if (open) closeModal();
    else openModal();
  }

  function closeAllDrawersAndMenus() {
    closeRail();
    closeDrawers();
    closeProfileMenu();
    if (State.overlays.drawer) hideOverlay("drawer");
  }

  // ESC closes top-most layer first
  function onKeyDown(e) {
    if (e.key !== "Escape") return;
    if (isModalOpen()) { closeModal(); return; }
    if (isAnyDrawerOpen()) { closeAllDrawersAndMenus(); return; }
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
    // EN default, VI if browser VI
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
    // Cloudflare Pages path
    const res = await fetch("/assets/i18n.json", { cache: "no-store" });
    if (!res.ok) throw new Error("i18n_load_failed");
    const json = await res.json();
    State.i18n = json;
  }

  function t(key) {
    const L = State.lang;
    const dict = State.i18n && State.i18n[L];
    return (dict && dict[key]) || key;
  }

  function applyLang(lang) {
    State.lang = (lang === "vi") ? "vi" : "en";
    try { localStorage.setItem("mn_lang", State.lang); } catch {}
    document.documentElement.lang = State.lang;

    // flags UI (if exists)
    const langCode = $("#langCode");
    const flagA = $("#flagA");
    const flagB = $("#flagB");
    if (langCode) langCode.textContent = State.lang.toUpperCase();
    if (flagA) flagA.textContent = "🇺🇸";
    if (flagB) flagB.textContent = "🇻🇳";

    // apply [data-i18n]
    $$("[data-i18n]").forEach((el) => {
      const k = el.getAttribute("data-i18n");
      if (!k) return;
      el.textContent = t(k);
    });

    // re-render view for route-specific strings
    onRouteChange({ replace: true, silentHistory: true });
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
      // dark -> show sun icon (switch to light), light -> show moon icon
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

    // external redirect route
    const url = new URL(path, location.origin);
    const matched = matchRoute(url.pathname);
    if (matched.external) {
      window.location.href = matched.external;
      return;
    }

    if (closeLayers) {
      closeAllDrawersAndMenus();
      if (isModalOpen()) closeModal();
    }

    if (replace) history.replaceState({}, "", url.pathname + url.search);
    else history.pushState({}, "", url.pathname + url.search);

    onRouteChange({ replace: true, silentHistory: true });
  }

  function onRouteChange({ silentHistory = false } = {}) {
    const pathname = location.pathname || "/";
    const search = location.search || "";
    const query = parseQuery(search);

    const r = matchRoute(pathname);
    State.route = { path: pathname, params: r.params || {}, query };

    // canonical for SEO
    let can = $('link[rel="canonical"]');
    if (!can) {
      can = document.createElement("link");
      can.rel = "canonical";
      document.head.appendChild(can);
    }
    can.href = canonicalUrl(pathname, search);

    const ogUrl = $('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute("content", can.href);

    renderRoute(r.view || "home", r.params || {}, query);
    setActiveNav(pathname);

    if (!silentHistory) {
      // no-op currently (kept for future analytics - not used)
    }
  }

  function setActiveNav(pathname) {
    const mark = (el, active) => {
      if (!el) return;
      if (active) el.classList.add("is-active");
      else el.classList.remove("is-active");
    };

    UI.navLinks = $$("[data-nav]");
    UI.tabLinks = $$("[data-tab]");

    UI.navLinks.forEach((a) => {
      const target = a.getAttribute("data-nav") || a.getAttribute("href") || "";
      if (!target) return;
      const p = target.startsWith("http") ? null : target.split("?")[0];
      if (!p) return;
      mark(a, p === pathname);
    });

    UI.tabLinks.forEach((a) => {
      const target = a.getAttribute("data-tab") || a.getAttribute("href") || "";
      if (!target) return;
      const p = target.startsWith("http") ? null : target.split("?")[0];
      if (!p) return;
      mark(a, p === pathname);
    });
  }

  // Intercept internal links globally
  function bindLinkInterceptor() {
    document.addEventListener("click", (e) => {
      const a = e.target && e.target.closest ? e.target.closest("a") : null;
      if (!a) return;
      if (!isInternalLink(a)) return;
      const href = a.getAttribute("href") || "";
      // allow hash anchors (rare) without SPA routing
      if (href.startsWith("#")) return;
      e.preventDefault();
      navigate(normalizePath(href));
    }, { passive: false });
  }

  // -----------------------------
  // Views
  // -----------------------------
  function pageTitleFor(view) {
    if (State.lang === "vi") {
      switch (view) {
        case "home": return "Muon Noi";
        case "explore": return "Khám Phá";
        case "create": return "Tạo";
        case "inbox": return "Tin Nhắn";
        case "wallet": return "Ví";
        case "settings": return "Cài Đặt";
        case "signin": return "Đăng Nhập";
        case "signup": return "Tạo Tài Khoản";
        case "post": return "Bài Viết";
        case "video": return "Video";
        case "course": return "Khóa Học";
        case "doc": return "Tài Liệu";
        case "market": return "Chợ";
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
      case "signup": return "Create Account";
      case "post": return "Post";
      case "video": return "Video";
      case "course": return "Course";
      case "doc": return "Document";
      case "market": return "Market";
      case "user": return "Profile";
      default: return "Muon Noi";
    }
  }

  function pageSubFor(view) {
    if (State.lang === "vi") {
      if (view === "home") return "Không phải bảng tin. Là không gian vận hành: làm việc, mua bán, học, live, nhắn tin, thanh toán.";
      if (view === "signin") return "Đăng nhập nhanh. Không theo dõi. Bảo mật theo thiết kế.";
      if (view === "signup") return "Tạo tài khoản để bắt đầu vận hành.";
      return "Module đang được hoàn thiện theo lộ trình.";
    }
    if (view === "home") return "Not a feed. A social operating space: work, market, learn, live, message, pay.";
    if (view === "signin") return "Fast sign in. No tracking. Secure by design.";
    if (view === "signup") return "Create an account to start operating.";
    return "Module is being finalized per roadmap.";
  }

  function renderRoute(view, params, query) {
    resolveUI();
    if (UI.pageTitle) setText(UI.pageTitle, pageTitleFor(view));
    if (UI.pageSub) setText(UI.pageSub, pageSubFor(view));

    if (!UI.view) return;

    switch (view) {
      case "home":
        UI.view.innerHTML = homeHTML();
        bindGoButtons(UI.view);
        return;

      case "signin":
        UI.view.innerHTML = authHTML("signin");
        bindGoButtons(UI.view);
        bindAuthActions(UI.view);
        return;

      case "signup":
        UI.view.innerHTML = authHTML("signup");
        bindGoButtons(UI.view);
        bindAuthActions(UI.view);
        return;

      default:
        UI.view.innerHTML = shellHTML(view, params, query);
        bindGoButtons(UI.view);
        return;
    }
  }

  function bindGoButtons(root) {
    $$("[data-go]", root).forEach((btn) => {
      btn.addEventListener("click", () => {
        const to = btn.getAttribute("data-go");
        if (!to) return;
        navigate(to);
      });
    });
  }

  function shellHTML(view, params) {
    const title = pageTitleFor(view);
    const hint = (State.lang === "vi")
      ? "Module này đang ở trạng thái khung. Bạn có thể quay lại trang chủ hoặc mở Docs."
      : "This module is currently a shell. You can go Home or open Docs.";

    const back = (State.lang === "vi") ? "Về Trang Chủ" : "Back Home";
    const docs = (State.lang === "vi") ? "Mở Docs" : "Open Docs";

    const pblock = params && Object.keys(params).length
      ? `<div class="status" style="margin-top:14px">${Object.keys(params).map(k =>
          `<div class="status__row"><span class="muted">${escapeHTML(k)}</span><span class="pillInline">${escapeHTML(params[k])}</span></div>`
        ).join("")}</div>`
      : "";

    return `
      <section class="panel" style="margin-top:16px">
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
          ${pblock}
        </div>
      </section>
    `;
  }

  function homeHTML() {
    const L = State.lang;

    const heroTitle = "Muon Noi";
    const heroLead = (L === "vi")
      ? "Một Không Gian Vận Hành Xã Hội Tất Cả Trong Một. Làm Việc, Kiếm Tiền, Mua Bán, Kinh Doanh, Học, Video, Livestream, Nhắn Tin, Gọi, Thanh Toán."
      : "An all-in-one Social Operating Space. Work, earn, trade, business, learn, video, livestream, message, call, pay.";

    const ctaCreate = (L === "vi") ? "Tạo Nội Dung" : "Create";
    const ctaExplore = (L === "vi") ? "Khám Phá" : "Explore";
    const ctaInbox = (L === "vi") ? "Tin Nhắn" : "Inbox";
    const ctaWallet = (L === "vi") ? "Ví" : "Wallet";
    const ctaSignIn = (L === "vi") ? "Đăng Nhập" : "Sign In";

        const privacyTitle = (L === "vi") ? "Bảo Mật Và Quyền Riêng Tư" : "Privacy & Security";
    const privacyText = (L === "vi")
      ? "Không thu thập dữ liệu hành vi. Không pixel theo dõi. Liên kết sạch. Thiết kế hướng tới mã hóa đầu cuối cho liên lạc, giao dịch và dữ liệu cá nhân."
      : "No behavioral tracking. No pixels. Clean links. Designed toward end-to-end encryption for communication, transactions and personal data.";

    const privacyPoints = (L === "vi")
      ? [
          "Không bán dữ liệu người dùng",
          "Không SDK bên thứ ba",
          "Không quảng cáo hành vi",
          "Kiến trúc hướng Web3 tương lai"
        ]
      : [
          "No user data selling",
          "No third-party SDKs",
          "No behavioral ads",
          "Web3-ready architecture"
        ];

    return `
      <section class="hero">
        <div>
          <span class="kicker">${escapeHTML(kicker)}</span>
          <h1>${escapeHTML(title)}</h1>
          <p class="lead">${escapeHTML(lead)}</p>

          <div class="hero__actions">
            <button class="btn btn--primary" data-route="/">
              <svg class="icon"><use href="#i-rocket"></use></svg>
              ${escapeHTML(ctaA)}
            </button>

            <button class="btn btn--ghost" data-route="/market">
              <svg class="icon"><use href="#i-bag"></use></svg>
              ${escapeHTML(ctaB)}
            </button>

            <button class="btn btn--ghost" data-route="/docs">
              <svg class="icon"><use href="#i-doc"></use></svg>
              ${escapeHTML(ctaC)}
            </button>
          </div>

          <div class="hero__chips">
            <span class="chip">Work</span>
            <span class="chip">Commerce</span>
            <span class="chip">Media</span>
            <span class="chip">Education</span>
            <span class="chip">Payments</span>
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
                <div class="heroSample__label">
                  ${L === "vi" ? "Nguyên tắc nền tảng" : "Core principles"}
                </div>
                <div class="code">
                  ${privacyPoints.map(p => `• ${escapeHTML(p)}`).join("<br/>")}
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
              <svg class="icon"><use href="#i-work"></use></svg>
              <span class="h2">${L === "vi" ? "Làm Việc & Kiếm Tiền" : "Work & Earn"}</span>
            </div>
          </div>
          <div class="panel__block hint">
            ${L === "vi"
              ? "Hồ sơ năng lực. Dự án. Hợp tác. Thanh toán trực tuyến và ngoại tuyến."
              : "Profiles. Projects. Collaboration. Online and offline payments."}
          </div>
        </div>

        <div class="panel">
          <div class="panel__head">
            <div class="panel__titleRow">
              <svg class="icon"><use href="#i-video"></use></svg>
              <span class="h2">${L === "vi" ? "Video & Livestream" : "Video & Livestream"}</span>
            </div>
          </div>
          <div class="panel__block hint">
            ${L === "vi"
              ? "Chia sẻ nội dung. Khóa học. Phát trực tiếp. Tài liệu số."
              : "Share content. Courses. Live streaming. Digital documents."}
          </div>
        </div>

        <div class="panel">
          <div class="panel__head">
            <div class="panel__titleRow">
              <svg class="icon"><use href="#i-lock"></use></svg>
              <span class="h2">${L === "vi" ? "Bảo Mật Cao Nhất" : "High Security"}</span>
            </div>
          </div>
          <div class="panel__block hint">
            ${L === "vi"
              ? "Thiết kế không theo dõi. Kiến trúc mã hóa. Quyền riêng tư là mặc định."
              : "No tracking by design. Encryption-ready architecture. Privacy by default."}
          </div>
        </div>
      </section>
    `;
