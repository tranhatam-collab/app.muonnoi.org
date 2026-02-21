(function () {
  "use strict";

  const app = document.querySelector(".app");
  const rail = document.getElementById("rail");
  const overlay = document.getElementById("overlay");

  const btnOpenRail = document.getElementById("btnOpenRail");
  const btnTheme = document.getElementById("btnTheme");
  const btnQuick = document.getElementById("btnQuick");
  const btnOpenCommand = document.getElementById("btnOpenCommand");
  const btnCloseCommand = document.getElementById("btnCloseCommand");
  const cmdModal = document.getElementById("cmdModal");
  const cmdInput = document.getElementById("cmdInput");
  const cmdList = document.getElementById("cmdList");

  const pageTitle = document.getElementById("pageTitle");
  const pageSub = document.getElementById("pageSub");
  const themeLabel = document.getElementById("themeLabel");

  const search = document.getElementById("globalSearch");
  const btnClearSearch = document.getElementById("btnClearSearch");

  const toasts = document.getElementById("toasts");

  // ---------------------------
  // Helpers
  // ---------------------------
  function isDesktop() {
    return window.matchMedia("(min-width: 1024px)").matches;
  }

  function setOverlay(on) {
    if (!overlay) return;
    overlay.hidden = !on;
  }

  function openRail() {
    if (!rail || isDesktop()) return;
    rail.classList.add("is-open");
    btnOpenRail?.setAttribute("aria-expanded", "true");
    setOverlay(true);
  }

  function closeRail() {
    if (!rail) return;
    rail.classList.remove("is-open");
    btnOpenRail?.setAttribute("aria-expanded", "false");
    setOverlay(false);
  }

  function openModal(el) {
    if (!el) return;
    el.hidden = false;
    setOverlay(true);
    setTimeout(() => {
      const focusable = el.querySelector("input, button, [href]");
      focusable && focusable.focus();
    }, 0);
  }

  function closeModal(el) {
    if (!el) return;
    el.hidden = true;
    setOverlay(false);
  }

  function toast(title, desc) {
    if (!toasts) return;
    const t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = `<div class="toast__t">${escapeHtml(title)}</div><div class="toast__d">${escapeHtml(desc)}</div>`;
    toasts.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  // ---------------------------
  // Theme
  // ---------------------------
  const THEME_KEY = "muonnoi.ui.theme";
  function applyTheme(next) {
    app.setAttribute("data-theme", next);
    if (themeLabel) themeLabel.textContent = next === "light" ? "Light" : "Dark";
    // icon swap
    const use = btnTheme?.querySelector("use");
    if (use) use.setAttribute("href", `/assets/icons.svg#${next === "light" ? "i-sun" : "i-moon"}`);
    try { localStorage.setItem(THEME_KEY, next); } catch (_) {}
  }
  function toggleTheme() {
    const cur = app.getAttribute("data-theme") || "dark";
    applyTheme(cur === "dark" ? "light" : "dark");
    toast("Giao dien", "Da doi theme.");
  }
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") applyTheme(saved);
  } catch (_) {}

  // ---------------------------
  // Router (UI only)
  // ---------------------------
  const ROUTES = {
    home:     { title: "Trang chu", sub: "Khung giao dien hoan thien. Chen noi dung sau." },
    explore:  { title: "Kham pha",  sub: "Khung UI. Sau se gan data va tim kiem." },
    create:   { title: "Tao moi",   sub: "Composer UI frame. Sau se gan logic." },
    messages: { title: "Tin nhan",  sub: "Chat UI frame. Sau se gan E2EE." },
    profile:  { title: "Ho so",     sub: "Profile UI frame. Sau se gan DID/passkey." },
    settings: { title: "Cai dat",   sub: "Settings UI frame. Sau se gan he thong." },
    legal:    { title: "Phap ly",   sub: "UI frame. Sau se chen noi dung phap ly." },
    privacy:  { title: "Rieng tu",  sub: "UI frame. Sau se chen noi dung rieng tu." },
    about:    { title: "Gioi thieu",sub: "UI frame. Sau se chen manifest." },
    channels: { title: "Channels",  sub: "UI frame. Sau se chen danh sach." },
    circles:  { title: "Circles",   sub: "UI frame. Sau se chen nhom." },
    drafts:   { title: "Drafts",    sub: "UI frame. Sau se chen ban nhap." }
  };

  function getRouteFromHash() {
    const h = (location.hash || "#/home").replace("#/", "");
    const route = h.split("?")[0].trim();
    return ROUTES[route] ? route : "home";
  }

  function setActiveNav(route) {
    document.querySelectorAll("[data-route]").forEach(a => {
      a.classList.toggle("is-active", a.getAttribute("data-route") === route);
    });
  }

  function renderRoute(route) {
    const r = ROUTES[route];
    if (pageTitle) pageTitle.textContent = r.title;
    if (pageSub) pageSub.textContent = r.sub;
    setActiveNav(route);

    // UI-only: show a toast to confirm navigation
    toast("Dieu huong", `Da mo: ${r.title}`);

    // close rail on mobile
    closeRail();
  }

  window.addEventListener("hashchange", () => renderRoute(getRouteFromHash()));
  renderRoute(getRouteFromHash());

  // ---------------------------
  // Events
  // ---------------------------
  btnOpenRail?.addEventListener("click", () => {
    if (rail?.classList.contains("is-open")) closeRail();
    else openRail();
  });

  overlay?.addEventListener("click", () => {
    closeRail();
    closeModal(cmdModal);
  });

  window.addEventListener("resize", () => {
    if (isDesktop()) {
      closeRail();
      setOverlay(false);
      if (cmdModal && !cmdModal.hidden) setOverlay(true);
    }
  });

  btnTheme?.addEventListener("click", toggleTheme);

  btnQuick?.addEventListener("click", () => {
    location.hash = "#/create";
  });

  btnOpenCommand?.addEventListener("click", () => openModal(cmdModal));
  btnCloseCommand?.addEventListener("click", () => closeModal(cmdModal));

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      openModal(cmdModal);
    }
    if (e.key === "Escape") {
      closeRail();
      closeModal(cmdModal);
    }
  });

  // Command palette
  cmdInput?.addEventListener("input", () => {
    const q = (cmdInput.value || "").trim().toLowerCase();
    cmdList?.querySelectorAll(".cmd__item").forEach((btn) => {
      const t = btn.textContent.toLowerCase();
      btn.hidden = q ? !t.includes(q) : false;
    });
  });
  cmdList?.addEventListener("click", (e) => {
    const btn = e.target.closest(".cmd__item");
    if (!btn) return;
    const go = btn.getAttribute("data-go");
    if (go) location.hash = go;
    closeModal(cmdModal);
  });

  // Search
  btnClearSearch?.addEventListener("click", () => {
    if (!search) return;
    search.value = "";
    search.focus();
    toast("Tim kiem", "Da xoa.");
  });
})();
