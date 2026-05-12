(() => {
  "use strict";

  const API_BASE = "https://api.muonnoi.org";
  const ENDPOINTS = {
    register: `${API_BASE}/api/register`,
    login: `${API_BASE}/api/login`,
    me: `${API_BASE}/api/me`,
    logout: `${API_BASE}/api/logout`,
    profile: `${API_BASE}/api/me/profile`
  };

  function pad(n) { return String(n).padStart(2, "0"); }
  function genRef() {
    const d = new Date();
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const da = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    const r = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `MN-${y}${m}${da}-${hh}${mm}${ss}-${r}`;
  }

  async function copy(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {}
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      return true;
    } catch {
      return false;
    }
  }

  const tabIn = document.getElementById("tabSignIn");
  const tabUp = document.getElementById("tabSignUp");
  const pIn = document.getElementById("panelSignIn");
  const pUp = document.getElementById("panelSignUp");

  const formIn = document.getElementById("formSignIn");
  const formUp = document.getElementById("formSignUp");
  const profileForm = document.getElementById("profileForm");

  const res = document.getElementById("joinResult");
  const joinRef = document.getElementById("joinRef");
  const joinResultTitle = document.getElementById("joinResultTitle");
  const joinResultBody = document.getElementById("joinResultBody");
  const joinRefWrap = document.getElementById("joinRefWrap");
  const copyBtn = document.getElementById("copyJoinRef");
  const refreshSessionBtn = document.getElementById("refreshSessionBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const profilePanel = document.getElementById("profilePanel");

  function show(which) {
    const isUp = which === "up";
    if (pIn) pIn.style.display = isUp ? "none" : "block";
    if (pUp) pUp.style.display = isUp ? "block" : "none";
    if (tabIn) tabIn.classList.toggle("mn-btn--primary", !isUp);
    if (tabIn) tabIn.classList.toggle("mn-btn--ghost", isUp);
    if (tabUp) tabUp.classList.toggle("mn-btn--primary", isUp);
    if (tabUp) tabUp.classList.toggle("mn-btn--ghost", !isUp);
  }

  function setButtonState(btn, busy, idleText, busyText) {
    if (!btn) return;
    btn.disabled = !!busy;
    btn.textContent = busy ? busyText : idleText;
  }

  function showStatus(title, body, ref) {
    if (joinResultTitle) joinResultTitle.textContent = title;
    if (joinResultBody) joinResultBody.textContent = body;
    if (joinRef) joinRef.textContent = ref || genRef();
    if (joinRefWrap) joinRefWrap.style.display = ref ? "block" : "none";
    if (res) res.style.display = "block";
    try { res.scrollIntoView({ behavior: "smooth", block: "center" }); } catch {}
  }

  function setProfileForm(user) {
    if (!profileForm) return;
    const elements = profileForm.elements;
    if (elements.namedItem("name")) elements.namedItem("name").value = user?.name || "";
    if (elements.namedItem("username")) elements.namedItem("username").value = user?.username || "";
    if (elements.namedItem("bio")) elements.namedItem("bio").value = user?.bio || "";
    if (elements.namedItem("avatar_url")) elements.namedItem("avatar_url").value = user?.avatar_url || "";
  }

  function setProfileVisible(visible) {
    if (profilePanel) profilePanel.style.display = visible ? "block" : "none";
    if (logoutBtn) logoutBtn.style.display = visible ? "inline-flex" : "none";
  }

  async function readJson(response) {
    const payload = await response.json().catch(() => ({ ok: false, error: "Phản hồi không hợp lệ" }));
    if (!response.ok) {
      const error = payload && typeof payload.error === "string" ? payload.error : "Yêu cầu thất bại";
      throw new Error(error);
    }
    return payload;
  }

  async function callApi(url, options) {
    const response = await fetch(url, Object.assign({
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    }, options || {}));
    return readJson(response);
  }

  function userSummary(user) {
    if (!user) return "Chưa có dữ liệu người dùng.";
    const handle = user.username ? `@${user.username}` : "chưa có username";
    const verified = user.is_verified ? "đã xác minh" : "chưa xác minh";
    return `${user.name || "Thành viên"} , ${handle} , ${verified}.`;
  }

  async function syncSession(successTitle) {
    const payload = await callApi(ENDPOINTS.me, { method: "GET" });
    const user = payload && payload.data ? payload.data : null;
    setProfileVisible(!!user);
    setProfileForm(user);
    showStatus(successTitle || "Phiên đang hoạt động", userSummary(user), `MN-SESSION-${user ? user.id : "UNKNOWN"}`);
    return user;
  }

  tabIn && tabIn.addEventListener("click", () => show("in"));
  tabUp && tabUp.addEventListener("click", () => show("up"));

  formIn && formIn.addEventListener("submit", async (e) => {
    e.preventDefault();
    setButtonState(document.getElementById("btnMagic"), true, "Đăng nhập", "Đang đăng nhập...");
    try {
      const fd = new FormData(formIn);
      await callApi(ENDPOINTS.login, {
        method: "POST",
        body: JSON.stringify({
          email: (fd.get("email") || "").toString().trim(),
          password: (fd.get("password") || "").toString()
        })
      });
      await syncSession("Đăng nhập thành công");
      try { formIn.reset(); } catch {}
    } catch (err) {
      showStatus("Đăng nhập chưa thành công", err instanceof Error ? err.message : "Không thể đăng nhập.");
      setProfileVisible(false);
    } finally {
      setButtonState(document.getElementById("btnMagic"), false, "Đăng nhập", "Đang đăng nhập...");
    }
  });

  formUp && formUp.addEventListener("submit", async (e) => {
    e.preventDefault();
    setButtonState(document.getElementById("btnCreate"), true, "Tạo tài khoản", "Đang tạo...");
    try {
      const fd = new FormData(formUp);
      await callApi(ENDPOINTS.register, {
        method: "POST",
        body: JSON.stringify({
          name: (fd.get("name") || "").toString().trim(),
          username: (fd.get("handle") || "").toString().trim().toLowerCase(),
          email: (fd.get("email") || "").toString().trim(),
          password: (fd.get("password") || "").toString()
        })
      });
      await syncSession("Tạo tài khoản thành công");
      try { formUp.reset(); } catch {}
      const agree = document.getElementById("agreeUp");
      if (agree) agree.checked = false;
    } catch (err) {
      showStatus("Tạo tài khoản chưa thành công", err instanceof Error ? err.message : "Không thể tạo tài khoản.");
      setProfileVisible(false);
    } finally {
      setButtonState(document.getElementById("btnCreate"), false, "Tạo tài khoản", "Đang tạo...");
    }
  });

  const btnGoogleIn = document.getElementById("btnGoogleIn");
  const btnGoogleUp = document.getElementById("btnGoogleUp");
  btnGoogleIn && btnGoogleIn.addEventListener("click", () => {
    alert("Google OAuth chưa được bật trên trang này. Hiện tại dùng email và mật khẩu.");
  });
  btnGoogleUp && btnGoogleUp.addEventListener("click", () => {
    alert("Google OAuth chưa được bật trên trang này. Hiện tại dùng email và mật khẩu.");
  });

  copyBtn && copyBtn.addEventListener("click", async () => {
    const ok = await copy(joinRef ? (joinRef.textContent || "") : "");
    copyBtn.textContent = ok ? "Đã sao chép" : "Không sao chép được";
    setTimeout(() => { copyBtn.textContent = "Sao chép mã phiên"; }, 1200);
  });

  refreshSessionBtn && refreshSessionBtn.addEventListener("click", async () => {
    setButtonState(refreshSessionBtn, true, "Kiểm tra phiên", "Đang kiểm tra...");
    try {
      await syncSession("Phiên đang hoạt động");
    } catch (err) {
      showStatus("Chưa có phiên đăng nhập", err instanceof Error ? err.message : "Không thể kiểm tra phiên.");
      setProfileVisible(false);
    } finally {
      setButtonState(refreshSessionBtn, false, "Kiểm tra phiên", "Đang kiểm tra...");
    }
  });

  logoutBtn && logoutBtn.addEventListener("click", async () => {
    setButtonState(logoutBtn, true, "Đăng xuất", "Đang đăng xuất...");
    try {
      await callApi(ENDPOINTS.logout, { method: "POST", body: JSON.stringify({}) });
      setProfileVisible(false);
      if (profileForm) profileForm.reset();
      showStatus("Đã đăng xuất", "Phiên hiện tại đã được đóng.", genRef());
    } catch (err) {
      showStatus("Đăng xuất chưa thành công", err instanceof Error ? err.message : "Không thể đăng xuất.");
    } finally {
      setButtonState(logoutBtn, false, "Đăng xuất", "Đang đăng xuất...");
    }
  });

  profileForm && profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById("saveProfileBtn");
    setButtonState(saveBtn, true, "Lưu hồ sơ", "Đang lưu...");
    try {
      const fd = new FormData(profileForm);
      await callApi(ENDPOINTS.profile, {
        method: "PUT",
        body: JSON.stringify({
          name: (fd.get("name") || "").toString().trim(),
          username: (fd.get("username") || "").toString().trim().toLowerCase(),
          bio: (fd.get("bio") || "").toString().trim(),
          avatar_url: (fd.get("avatar_url") || "").toString().trim()
        })
      });
      await syncSession("Đã cập nhật hồ sơ");
    } catch (err) {
      showStatus("Cập nhật hồ sơ chưa thành công", err instanceof Error ? err.message : "Không thể lưu hồ sơ.");
    } finally {
      setButtonState(saveBtn, false, "Lưu hồ sơ", "Đang lưu...");
    }
  });

  show("up");
  setProfileVisible(false);
  syncSession("Phiên đang hoạt động").catch(() => {});
})();
