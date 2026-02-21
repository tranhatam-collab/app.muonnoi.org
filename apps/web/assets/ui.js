// apps/web/assets/ui.js
// Muon Noi UI Shell controller — no libs — stable build

(function () {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  const app = $("#app");
  const overlay = $("#overlay");
  const rail = $("#rail");

  const btnOpenRail = $("#btnOpenRail");
  const btnOpenSearch = $("#btnOpenSearch");
  const btnOpenNoti = $("#btnOpenNoti");
  const btnTheme = $("#btnTheme");
  const btnQuick = $("#btnQuick");
  const btnProfile = $("#btnProfile");
  const profileMenu = $("#profileMenu");
  const btnLogout = $("#btnLogout");

  const searchDrawer = $("#searchDrawer");
  const notiDrawer = $("#notiDrawer");
  const btnCommand = $("#btnCommand");
  const cmdModal = $("#cmdModal");
  const cmdInput = $("#cmdInput");
  const cmdList = $("#cmdList");

  const pageTitle = $("#pageTitle");
  const pageSub = $("#pageSub");
  const themeLabel = $("#themeLabel");
  const toasts = $("#toasts");

  // Optional hero button (if exists in index.html)
  const btnOpenSearch2 = $("#btnOpenSearch2");

  const isDesktop = () => window.matchMedia("(min-width: 960px)").matches;

  function showOverlay(on) {
    if (!overlay) return;
    overlay.hidden = !on;
  }

  function anyDrawerOpen() {
    const sOpen = searchDrawer && !searchDrawer.hidden && searchDrawer.classList.contains("is-open");
    const nOpen = notiDrawer && !notiDrawer.hidden && notiDrawer.classList.contains("is-open");
    return !!(sOpen || nOpen);
  }

  function anyFloatingOpen() {
    const railOpen = !isDesktop() && rail?.classList.contains("is-open");
    const drawerOpen = anyDrawerOpen();
    const menuOpen = profileMenu && !profileMenu.hidden;
    const modalOpen = cmdModal && !cmdModal.hidden;
    return !!(railOpen || drawerOpen || menuOpen || modalOpen);
  }

  function closeMenu() {
    if (!profileMenu) return;
    profileMenu.hidden = true;
    btnProfile?.setAttribute("aria-expanded", "false");
  }

  function closeRail() {
    if (isDesktop()) return;
    rail?.classList.remove("is-open");
    btnOpenRail?.setAttribute("aria-expanded", "false");
  }

  function closeDrawer(drawer) {
    if (!drawer) return;
    drawer.classList.remove("is-open");
    setTimeout(() => {
      drawer.hidden = true;
      if (!anyFloatingOpen()) showOverlay(false);
      else if (!anyDrawerOpen() && !(!isDesktop() && rail?.classList.contains("is-open")) && (profileMenu?.hidden ?? true) && (cmdModal?.hidden ?? true)) {
        showOverlay(false);
      }
    }, 220);
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.hidden = true;
    if (!anyFloatingOpen()) showOverlay(false);
  }

  function closeAllFloating() {
    closeRail();

    // drawers
    if (searchDrawer) { searchDrawer.classList.remove("is-open"); searchDrawer.hidden = true; }
    if (notiDrawer) { notiDrawer.classList.remove("is-open"); notiDrawer.hidden = true; }

    // menu
    closeMenu();

    // modal
    if (cmdModal) cmdModal.hidden = true;

    showOverlay(false);
  }

  function openRail() {
    if (isDesktop()) return;
    rail?.classList.add("is-open");
    btnOpenRail?.setAttribute("aria-expanded", "true");
    showOverlay(true);
  }

  function toggleRail() {
    if (isDesktop()) return;
    const open = rail?.classList.toggle("is-open");
    btnOpenRail?.setAttribute("aria-expanded", open ? "true" : "false");
    showOverlay(!!open);
  }

  function openDrawer(drawer) {
    if (!drawer) return;

    // close other drawers
    [searchDrawer, notiDrawer].forEach((d) => {
      if (!d || d === drawer) return;
      d.classList.remove("is-open");
      d.hidden = true;
    });

    // also close profile menu (so it doesn't overlap)
    closeMenu();

    drawer.hidden = false;
    requestAnimationFrame(() => drawer.classList.add("is-open"));
    showOverlay(true);
  }

  function toggleMenu() {
    if (!profileMenu) return;
    const willOpen = profileMenu.hidden === true;

    // close drawers if opening menu
    if (willOpen) {
      if (searchDrawer && !searchDrawer.hidden) closeDrawer(searchDrawer);
      if (notiDrawer && !notiDrawer.hidden) closeDrawer(notiDrawer);
    }

    profileMenu.hidden = !willOpen ? true : false;
    btnProfile?.setAttribute("aria-expanded", willOpen ? "true" : "false");
    showOverlay(willOpen);
  }

  function openModal(modal) {
    if (!modal) return;

    // close drawers + menu for clean focus
    if (searchDrawer && !searchDrawer.hidden) closeDrawer(searchDrawer);
    if (notiDrawer && !notiDrawer.hidden) closeDrawer(notiDrawer);
    closeMenu();
    closeRail();

    modal.hidden = false;
    showOverlay(true);

    setTimeout(() => {
      cmdInput?.focus();
      cmdInput?.select?.();
    }, 0);
  }

  function toast(title, desc) {
    if (!toasts) return;
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `
      <div class="toast__t"></div>
      <div class="toast__d"></div>
    `;
    el.querySelector(".toast__t").textContent = title || "Thông báo";
    el.querySelector(".toast__d").textContent = desc || "";
    toasts.appendChild(el);

    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateY(4px)";
      setTimeout(() => el.remove(), 240);
    }, 2600);
  }

  // Theme
  function applyTheme(theme) {
    const t = theme === "light" ? "light" : "dark";
    app?.setAttribute("data-theme", t);
    try { localStorage.setItem("mn_theme", t); } catch (e) {}

    const iconUse = btnTheme?.querySelector("use");
    if (iconUse) iconUse.setAttribute("href", `/assets/icons.svg#${t === "dark" ? "i-moon" : "i-sun"}`);

    if (themeLabel) themeLabel.textContent = t === "dark" ? "Tối" : "Sáng";
  }

  function toggleTheme() {
    const cur = app?.getAttribute("data-theme") || "dark";
    applyTheme(cur === "dark" ? "light" : "dark");
    toast("Giao diện", (app?.getAttribute("data-theme") === "dark") ? "Đã chuyển sang chế độ tối." : "Đã chuyển sang chế độ sáng.");
  }

  // Router (UI only)
  const routes = {
    home: { title: "Trang chủ", sub: "Dòng thời gian và nội dung tổng hợp." },
    explore: { title: "Khám phá", sub: "Tìm chủ đề, ý tưởng, và người phù hợp." },
    create: { title: "Tạo", sub: "Tạo bài viết, ý tưởng, hoặc proof." },
    messages: { title: "Tin nhắn", sub: "Không ồn. Tập trung vào đối thoại." },
    profile: { title: "Hồ sơ", sub: "Bạn là ai, bạn muốn gì, bạn đang làm gì." },
    settings: { title: "Cài đặt", sub: "Quyền riêng tư, hiển thị, và các tùy chọn." },
    about: { title: "Giới thiệu", sub: "Muon Noi là một nền tảng xã hội hướng về con người." }
  };

  function setActiveNav(route) {
    $$(".nav__item").forEach((a) => a.classList.toggle("is-active", a.dataset.route === route));
    $$(".tabbar__item").forEach((a) => a.classList.toggle("is-active", a.dataset.route === route));
  }

  function go(hash) {
    const clean = (hash || "").replace(/^#\/?/, "");
    const route = clean.split("/")[0] || "home";
    const r = routes[route] || routes.home;

    if (pageTitle) pageTitle.textContent = r.title;
    if (pageSub) pageSub.textContent = r.sub;
    setActiveNav(route);

    // close overlays on navigation (mobile)
    if (!isDesktop()) closeAllFloating();
  }

  // Events
  btnOpenRail?.addEventListener("click", (e) => { e.preventDefault(); toggleRail(); });

  overlay?.addEventListener("click", (e) => {
    e.preventDefault();
    closeAllFloating();
  });

  btnOpenSearch?.addEventListener("click", (e) => {
    e.preventDefault();
    openDrawer(searchDrawer);
  });

  btnOpenSearch2?.addEventListener("click", (e) => {
    e.preventDefault();
    openDrawer(searchDrawer);
  });

  btnOpenNoti?.addEventListener("click", (e) => {
    e.preventDefault();
    openDrawer(notiDrawer);
  });

  // Close buttons by data-close
  $$("[data-close]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const id = btn.getAttribute("data-close");
      const el = id ? document.getElementById(id) : null;
      if (!el) return;

      if (el.classList.contains("drawer")) return closeDrawer(el);
      if (el.classList.contains("modal")) return closeModal(el);

      el.hidden = true;
      if (!anyFloatingOpen()) showOverlay(false);
    });
  });

  btnTheme?.addEventListener("click", (e) => { e.preventDefault(); toggleTheme(); });

  btnQuick?.addEventListener("click", (e) => {
    e.preventDefault();
    toast("Tạo mới", "Bước sau sẽ gắn composer và API.");
    openModal(cmdModal);
  });

  btnProfile?.addEventListener("click", (e) => { e.preventDefault(); toggleMenu(); });

  btnLogout?.addEventListener("click", (e) => {
    e.preventDefault();
    toast("Đăng xuất", "Đây là UI shell. Bước sau sẽ gắn xác thực.");
    closeAllFloating();
  });

  btnCommand?.addEventListener("click", (e) => { e.preventDefault(); openModal(cmdModal); });

  cmdModal?.addEventListener("click", (e) => {
    if (e.target === cmdModal) closeModal(cmdModal);
  });

  cmdList?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-go]");
    if (!btn) return;
    const dest = btn.getAttribute("data-go");
    if (dest) window.location.hash = dest;
    closeModal(cmdModal);
  });

  cmdInput?.addEventListener("input", () => {
    const q = (cmdInput.value || "").trim().toLowerCase();
    $$(".cmdList__item", cmdList).forEach((item) => {
      const text = item.textContent.toLowerCase();
      item.style.display = !q || text.includes(q) ? "" : "none";
    });
  });

  // Keyboard
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeAllFloating();
      return;
    }
    const isK = e.key.toLowerCase() === "k";
    if (isK && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      openModal(cmdModal);
      return;
    }
  });

  // Router init
  window.addEventListener("hashchange", () => go(window.location.hash));

  // Resize behavior: close mobile rail when entering desktop
  window.addEventListener("resize", () => {
    if (isDesktop()) {
      showOverlay(false);
      rail?.classList.remove("is-open");
      btnOpenRail?.setAttribute("aria-expanded", "false");
    }
  });

  // Init theme
  (function initTheme() {
    try {
      const saved = localStorage.getItem("mn_theme");
      if (saved) return applyTheme(saved);
    } catch (e) {}
    const prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
    applyTheme(prefersLight ? "light" : "dark");
  })();

  // Init route
  if (!window.location.hash) window.location.hash = "#/home";
  go(window.location.hash);

  // First paint toast
  setTimeout(() => {
    toast("Muon Noi", "Khung giao diện đã sẵn sàng. Tiếp theo sẽ gắn nội dung và API.");
  }, 450);

  // Ensure overlay starts hidden
  closeAllFloating();
})();
