(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function copyText(text) {
    return (async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
          return true;
        }
      } catch {}

      try {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
        return true;
      } catch {
        return false;
      }
    })();
  }

  function chainId(prefix = "mn") {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1e9);
    const raw = `${prefix}.${timestamp}.${random}`;
    let hash = 2166136261;

    for (let index = 0; index < raw.length; index += 1) {
      hash ^= raw.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }

    const checksum = (hash >>> 0).toString(36).padStart(6, "0").slice(0, 6);
    return `${prefix}_${(timestamp >>> 0).toString(36)}_${(random >>> 0).toString(36)}_${checksum}`;
  }

  function genRef() {
    const now = new Date();
    const pad = (value) => String(value).padStart(2, "0");
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();

    return `MN-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}-${random}`;
  }

  function restoreLegacyAppTheme() {
    const app = document.getElementById("app");
    if (!app || !app.hasAttribute("data-theme")) return;

    try {
      const theme = localStorage.getItem("mn_theme");
      if (theme === "dark" || theme === "light") {
        app.setAttribute("data-theme", theme);
      }
    } catch {}
  }

  function setupJoinPage() {
    const formIn = document.getElementById("formSignIn");
    const formUp = document.getElementById("formSignUp");
    if (!formIn && !formUp) return;

    const tabIn = document.getElementById("tabSignIn");
    const tabUp = document.getElementById("tabSignUp");
    const panelIn = document.getElementById("panelSignIn");
    const panelUp = document.getElementById("panelSignUp");
    const result = document.getElementById("joinResult");
    const joinRef = document.getElementById("joinRef");
    const copyBtn = document.getElementById("copyJoinRef");
    const btnGoogleIn = document.getElementById("btnGoogleIn");
    const btnGoogleUp = document.getElementById("btnGoogleUp");

    function show(which) {
      const isSignUp = which === "up";
      if (panelIn) panelIn.style.display = isSignUp ? "none" : "block";
      if (panelUp) panelUp.style.display = isSignUp ? "block" : "none";
      if (tabIn) tabIn.classList.toggle("mn-btn--primary", !isSignUp);
      if (tabIn) tabIn.classList.toggle("mn-btn--ghost", isSignUp);
      if (tabUp) tabUp.classList.toggle("mn-btn--primary", isSignUp);
      if (tabUp) tabUp.classList.toggle("mn-btn--ghost", !isSignUp);
    }

    function done() {
      if (joinRef) joinRef.textContent = genRef();
      if (result) {
        result.style.display = "block";
        try {
          result.scrollIntoView({ behavior: "smooth", block: "center" });
        } catch {}
      }
    }

    tabIn?.addEventListener("click", () => show("in"));
    tabUp?.addEventListener("click", () => show("up"));

    formIn?.addEventListener("submit", (event) => {
      event.preventDefault();
      done();
      try {
        formIn.reset();
      } catch {}
    });

    formUp?.addEventListener("submit", (event) => {
      event.preventDefault();
      done();
      try {
        formUp.reset();
      } catch {}

      const agree = document.getElementById("agreeUp");
      if (agree) agree.checked = false;
    });

    const googleMessage = "UI sẵn. Giai đoạn sau bật Google OAuth trên api.muonnoi.org.";
    btnGoogleIn?.addEventListener("click", () => alert(googleMessage));
    btnGoogleUp?.addEventListener("click", () => alert(googleMessage));

    copyBtn?.addEventListener("click", async () => {
      const ok = await copyText(joinRef ? joinRef.textContent || "" : "");
      copyBtn.textContent = ok ? "Đã sao chép" : "Không sao chép được";
      window.setTimeout(() => {
        copyBtn.textContent = "Sao chép mã";
      }, 1200);
    });

    show("up");
  }

  function setupFeedPage() {
    const feedList = document.getElementById("feedList");
    const composerText = document.getElementById("composerText");
    if (!feedList || !composerText) return;

    const state = {
      filter: "all",
      items: []
    };

    function sampleData(count = 9, filter = "all") {
      const types = ["work", "market", "learn", "invest"];
      const pick = () => types[Math.floor(Math.random() * types.length)];
      const now = Date.now();
      const items = [];

      for (let index = 0; index < count; index += 1) {
        const type = filter === "all" ? pick() : filter;
        items.push({
          id: chainId("mn"),
          type,
          author:
            type === "work"
              ? "Người Tuyển Dụng"
              : type === "market"
                ? "Người Bán"
                : type === "learn"
                  ? "Người Dạy"
                  : "Nhà Đầu Tư",
          handle:
            type === "work"
              ? "workhub"
              : type === "market"
                ? "marketvn"
                : type === "learn"
                  ? "learnlab"
                  : "investroom",
          title:
            type === "work"
              ? "Tuyển: Designer / Dev (Remote)"
              : type === "market"
                ? "Bán: Gói dịch vụ / sản phẩm"
                : type === "learn"
                  ? "Khóa học: Kỹ năng / tư duy"
                  : "Deal: Cơ hội hợp tác",
          body:
            type === "work"
              ? "Mô tả công việc rõ ràng. Không spam. Có trách nhiệm."
              : type === "market"
                ? "Giá trị thật, điều kiện rõ. Không lừa đảo."
                : type === "learn"
                  ? "Học để làm được. Không lý thuyết rỗng."
                  : "Đầu tư minh bạch. Không hype.",
          ts: now - Math.floor(Math.random() * 86400000),
          likes: Math.floor(Math.random() * 120),
          saves: Math.floor(Math.random() * 60),
          comments: Math.floor(Math.random() * 18),
          verified: Math.random() > 0.7
        });
      }

      return items;
    }

    function badge(type) {
      if (type === "work") return "Làm việc";
      if (type === "market") return "Mua bán";
      if (type === "learn") return "Học";
      if (type === "invest") return "Đầu tư";
      return "Tất cả";
    }

    function timeAgo(timestamp) {
      const seconds = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      if (days > 0) return `${days}d`;
      if (hours > 0) return `${hours}h`;
      if (minutes > 0) return `${minutes}m`;
      return `${seconds}s`;
    }

    function postCard(item) {
      const verified = item.verified ? '<span class="mn-pillMini">Verified</span>' : "";
      const link = `/p/${encodeURIComponent(item.id)}/`;

      return `
        <article class="mn-glass" style="border-radius:18px; padding:14px;">
          <div class="mn-postTop">
            <div class="mn-ava" aria-hidden="true">${item.handle.slice(0, 2).toUpperCase()}</div>
            <div style="flex:1">
              <div class="mn-inline" style="justify-content:space-between;">
                <div class="mn-postMeta">
                  <span class="mn-pillMini">${badge(item.type)}</span>
                  ${verified}
                  <span class="mn-muted">•</span>
                  <a class="mn-link" href="/u/${encodeURIComponent(item.handle)}/">u/${item.handle}</a>
                  <span class="mn-muted">•</span>
                  <span class="mn-muted">${timeAgo(item.ts)}</span>
                </div>
                <a class="mn-link" href="${link}">Mở</a>
              </div>

              <div style="height:8px;"></div>
              <div class="mn-h2" style="margin:0; font-size:16px;">${item.title}</div>
              <div class="mn-sub" style="margin-top:8px;">${item.body}</div>

              <div style="height:12px;"></div>

              <div class="mn-actions">
                <button class="mn-act" type="button" data-act="like" data-id="${item.id}">
                  ❤ <span>${item.likes}</span>
                </button>
                <button class="mn-act" type="button" data-act="save" data-id="${item.id}">
                  ⧉ <span>${item.saves}</span>
                </button>
                <button class="mn-act" type="button" data-act="comment" data-id="${item.id}">
                  💬 <span>${item.comments}</span>
                </button>
                <button class="mn-act" type="button" data-act="share" data-id="${item.id}">
                  ↗ <span>Share</span>
                </button>
              </div>

              <div class="mn-sub" style="margin-top:10px;">
                Link sạch: <span class="mn-code">${link}</span>
              </div>
            </div>
          </div>
        </article>
      `;
    }

    function render() {
      feedList.innerHTML = state.items.map(postCard).join("");
    }

    function setFilter(filter) {
      state.filter = filter;
      $$(".mn-segBtn").forEach((button) => {
        button.classList.toggle("is-active", button.getAttribute("data-feed") === filter);
      });
      state.items = sampleData(9, filter);
      render();
    }

    function bindActions() {
      $$(".mn-segBtn").forEach((button) => {
        button.addEventListener("click", () => {
          setFilter(button.getAttribute("data-feed") || "all");
        });
      });

      $$("[data-tag]").forEach((button) => {
        button.addEventListener("click", () => {
          const tag = button.getAttribute("data-tag");
          if (tag === "nhachung") {
            window.location.href = "https://nhachung.muonnoi.org/";
            return;
          }
          if (tag === "work") setFilter("work");
          else if (tag === "market") setFilter("market");
          else if (tag === "learn") setFilter("learn");
          else if (tag === "invest") setFilter("invest");
        });
      });

      const btnPost = document.getElementById("btnPost");
      const btnAttach = document.getElementById("btnAttach");
      const composerType = document.getElementById("composerType");
      const composerResult = document.getElementById("composerResult");
      const demoLink = document.getElementById("demoLink");
      const openDemoLink = document.getElementById("openDemoLink");
      const copyDemoLink = document.getElementById("copyDemoLink");

      btnAttach?.addEventListener("click", () => {
        alert("Giai đoạn sau: upload ảnh/video/tài liệu qua R2 signed upload + quét malware + chống spam.");
      });

      btnPost?.addEventListener("click", () => {
        const content = (composerText.value || "").trim();
        if (!content) {
          alert("Hãy viết nội dung trước khi đăng.");
          return;
        }

        const id = chainId("mn");
        const type = composerType ? composerType.value || "all" : "all";
        const item = {
          id,
          type: type === "all" ? "work" : type,
          author: "Bạn",
          handle: "you",
          title: "Bài mới",
          body: content.slice(0, 320),
          ts: Date.now(),
          likes: 0,
          saves: 0,
          comments: 0,
          verified: false
        };

        state.items = [item, ...state.items];
        render();

        const link = `/p/${encodeURIComponent(id)}/`;
        if (demoLink) demoLink.textContent = link;
        if (openDemoLink) openDemoLink.href = link;
        if (composerResult) {
          composerResult.style.display = "block";
          try {
            composerResult.scrollIntoView({ behavior: "smooth", block: "center" });
          } catch {}
        }

        composerText.value = "";
      });

      copyDemoLink?.addEventListener("click", async () => {
        const link = demoLink && demoLink.textContent ? `https://app.muonnoi.org${demoLink.textContent}` : "";
        const ok = await copyText(link);
        copyDemoLink.textContent = ok ? "Đã sao chép" : "Không sao chép được";
        window.setTimeout(() => {
          copyDemoLink.textContent = "Sao chép link";
        }, 1200);
      });

      const btnMore = document.getElementById("btnMore");
      btnMore?.addEventListener("click", () => {
        state.items = state.items.concat(sampleData(9, state.filter));
        render();
        window.scrollBy({ top: 420, behavior: "smooth" });
      });

      const btnRefresh = document.getElementById("btnRefresh");
      btnRefresh?.addEventListener("click", () => {
        state.items = sampleData(9, state.filter);
        render();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });

      document.addEventListener(
        "click",
        async (event) => {
          const button = event.target && event.target.closest ? event.target.closest("[data-act]") : null;
          if (!button) return;

          const action = button.getAttribute("data-act");
          const id = button.getAttribute("data-id");
          if (!action || !id) return;

          const item = state.items.find((entry) => entry.id === id);
          if (!item) return;

          const label = button.querySelector("span");

          if (action === "like") {
            item.likes += 1;
            button.classList.add("is-on");
            if (label) label.textContent = String(item.likes);
            return;
          }

          if (action === "save") {
            item.saves += 1;
            button.classList.add("is-on");
            if (label) label.textContent = String(item.saves);
            return;
          }

          if (action === "comment") {
            alert("Giai đoạn sau: mở thread /p/:id + bình luận + chống spam + quyền riêng tư.");
            return;
          }

          if (action === "share") {
            const link = `https://app.muonnoi.org/p/${encodeURIComponent(id)}/`;
            const ok = await copyText(link);
            button.classList.add("is-on");
            if (label) label.textContent = ok ? "Copied" : "Copy failed";
            window.setTimeout(() => {
              button.classList.remove("is-on");
              if (label) label.textContent = "Share";
            }, 1200);
          }
        },
        { passive: true }
      );
    }

    state.items = sampleData(9, "all");
    render();
    bindActions();
  }

  function setupCreatePage() {
    const createBtn = document.getElementById("btnCreate");
    const titleInput = document.getElementById("title");
    const bodyInput = document.getElementById("body");
    const resultPath = document.getElementById("resultPath");
    if (!createBtn || !titleInput || !bodyInput || !resultPath) return;

    const types = {
      post: { label: "Bài viết", path: (id) => `/p/${encodeURIComponent(id)}/` },
      video: { label: "Video", path: (id) => `/v/${encodeURIComponent(id)}/` },
      doc: { label: "Tài liệu", path: (id) => `/d/${encodeURIComponent(id)}/` },
      course: { label: "Khóa học", path: (id) => `/c/${encodeURIComponent(id)}/` },
      market: { label: "Sản phẩm", path: (id) => `/m/${encodeURIComponent(id)}/` }
    };

    const state = { type: "post" };

    function nowText() {
      const now = new Date();
      return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    }

    function refreshPreview() {
      const visibility = ($("#visibility")?.value || "public").trim();
      const category = ($("#category")?.value || "work").trim();

      const previewTitle = document.getElementById("pvTitle");
      const previewBody = document.getElementById("pvBody");
      const previewMeta = document.getElementById("pvMeta");
      const previewNow = document.getElementById("pvNow");
      const previewType = document.getElementById("pvType");

      if (previewTitle) previewTitle.textContent = titleInput.value.trim() || "Chưa có tiêu đề";
      if (previewBody) previewBody.textContent = bodyInput.value.trim() || "Nội dung sẽ hiển thị ở đây...";
      if (previewMeta) previewMeta.textContent = `${visibility} • ${category}`;
      if (previewNow) previewNow.textContent = nowText();
      if (previewType) previewType.textContent = types[state.type].label;
    }

    function setType(type) {
      state.type = types[type] ? type : "post";
      $$("#typeSeg .mn-segBtn").forEach((button) => {
        button.classList.toggle("is-active", button.getAttribute("data-type") === state.type);
      });
      refreshPreview();
    }

    $$("#typeSeg .mn-segBtn").forEach((button) => {
      button.addEventListener("click", () => setType(button.getAttribute("data-type")));
    });

    ["title", "body", "visibility", "category"].forEach((id) => {
      const element = document.getElementById(id);
      if (!element) return;
      element.addEventListener("input", refreshPreview);
      element.addEventListener("change", refreshPreview);
    });

    const attachBtn = document.getElementById("btnAttach");
    attachBtn?.addEventListener("click", () => {
      alert("Stage 2: R2 signed upload + quét file + chống spam + quyền riêng tư theo lớp.");
    });

    createBtn.addEventListener("click", () => {
      const title = titleInput.value.trim();
      const body = bodyInput.value.trim();

      if (!title && !body) {
        alert("Hãy nhập tiêu đề hoặc nội dung trước khi tạo.");
        return;
      }

      const path = types[state.type].path(chainId("mn"));
      resultPath.textContent = path;

      const openBtn = document.getElementById("btnOpen");
      if (openBtn) openBtn.href = path;

      const resultBox = document.getElementById("resultBox");
      if (resultBox) {
        resultBox.style.display = "block";
        try {
          resultBox.scrollIntoView({ behavior: "smooth", block: "center" });
        } catch {}
      }

      refreshPreview();
    });

    const copyBtn = document.getElementById("btnCopy");
    copyBtn?.addEventListener("click", async () => {
      const fullPath = resultPath.textContent ? `https://app.muonnoi.org${resultPath.textContent.trim()}` : "";
      const ok = await copyText(fullPath);
      copyBtn.textContent = ok ? "Đã sao chép" : "Không sao chép được";
      window.setTimeout(() => {
        copyBtn.textContent = "Sao chép";
      }, 1200);
    });

    setType("post");
  }

  function setupComplaintsPage() {
    const form = document.getElementById("complaintForm");
    if (!form) return;

    const resetBtn = document.getElementById("resetBtn");
    const resultBox = document.getElementById("resultBox");
    const refCode = document.getElementById("refCode");
    const copyRefBtn = document.getElementById("copyRefBtn");

    resetBtn?.addEventListener("click", () => {
      form.reset();
      if (resultBox) resultBox.style.display = "none";
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      if (refCode) refCode.textContent = genRef();
      if (resultBox) {
        resultBox.style.display = "block";
        try {
          resultBox.scrollIntoView({ behavior: "smooth", block: "center" });
        } catch {}
      }

      try {
        form.reset();
      } catch {}

      const agree = document.getElementById("agree");
      if (agree) agree.checked = false;
    });

    copyRefBtn?.addEventListener("click", async () => {
      const ok = await copyText(refCode ? refCode.textContent || "" : "");
      copyRefBtn.textContent = ok ? "Đã sao chép" : "Không sao chép được";
      window.setTimeout(() => {
        copyRefBtn.textContent = "Sao chép mã";
      }, 1200);
    });
  }

  function readLang() {
    try {
      const saved = localStorage.getItem("mn_lang");
      return saved === "vi" ? "vi" : "en";
    } catch {
      return "en";
    }
  }

  function setupFamilyFeedPage() {
    const feedList = document.getElementById("familyFeedList");
    const composerText = document.getElementById("familyComposerText");
    if (!feedList || !composerText) return;

    const state = {
      filter: "my",
      items: []
    };

    const tabs = [
      { key: "my", badgeVi: "Gia đình của bạn", badgeEn: "Your family" },
      { key: "care", badgeVi: "Đang quan tâm", badgeEn: "Currently caring about" },
      { key: "parenting", badgeVi: "Nuôi dạy con", badgeEn: "Parenting" },
      { key: "finance", badgeVi: "Tài chính gia đình", badgeEn: "Family finance" },
      { key: "relationship", badgeVi: "Mối quan hệ", badgeEn: "Relationships" },
      { key: "ai", badgeVi: "AI hỗ trợ", badgeEn: "AI assistance" }
    ];

    function badgeFor(type, lang) {
      const tab = tabs.find((x) => x.key === type);
      if (!tab) return "";
      return lang === "vi" ? tab.badgeVi : tab.badgeEn;
    }

    function timeAgo(timestamp) {
      const seconds = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      if (days > 0) return `${days}d`;
      if (hours > 0) return `${hours}h`;
      if (minutes > 0) return `${minutes}m`;
      return `${seconds}s`;
    }

    function sampleData(count = 9, filter = "my") {
      const types = tabs.map((t) => t.key);
      const pick = () => types[Math.floor(Math.random() * types.length)];
      const now = Date.now();

      const items = [];
      for (let index = 0; index < count; index += 1) {
        const type = filter === "all" ? pick() : filter;
        items.push({
          id: chainId("family"),
          type,
          author: "Gia đình demo",
          handle: "family",
          titleVi: type === "parenting" ? "Con không tập trung vào việc học" : type === "finance" ? "Cần kế hoạch chi tiêu tháng này" : type === "relationship" ? "Xung đột nhẹ giữa hai vợ chồng" : type === "ai" ? "AI gợi ý bài học cho tình huống hôm nay" : "Chia sẻ gia đình thật",
          titleEn: type === "parenting" ? "My child can't focus on study" : type === "finance" ? "We need a monthly spending plan" : type === "relationship" ? "A small conflict between spouses" : type === "ai" ? "AI suggestion for today's situation" : "A real family share",
          bodyVi: "Mô tả ngắn gọn, rõ bối cảnh, ưu tiên điều có thể áp dụng ngay.",
          bodyEn: "Short context-first description, prioritize actions we can apply immediately.",
          ts: now - Math.floor(Math.random() * 86400000),
          likes: Math.floor(Math.random() * 120),
          helpful: Math.floor(Math.random() * 60),
          applied: Math.random() > 0.68
        });
      }
      return items;
    }

    function render() {
      const lang = readLang();
      feedList.innerHTML = state.items
        .map((item) => {
          const title = lang === "vi" ? item.titleVi : item.titleEn;
          const body = lang === "vi" ? item.bodyVi : item.bodyEn;
          const badge = badgeFor(item.type, lang);
          const appliedTag = item.applied
            ? lang === "vi"
              ? '<span class="mn-pillMini">Đã áp dụng</span>'
              : '<span class="mn-pillMini">Applied</span>'
            : "";

          return `
            <article class="mn-glass" style="border-radius:18px;padding:14px;">
              <div class="mn-postTop">
                <div class="mn-ava" aria-hidden="true">F</div>
                <div style="flex:1">
                  <div class="mn-inline" style="justify-content:space-between;">
                    <div class="mn-postMeta">
                      <span class="mn-pillMini">${badge}</span>
                      ${appliedTag}
                      <span class="mn-muted">•</span>
                      <span class="mn-muted">${timeAgo(item.ts)}</span>
                    </div>
                    <button class="mn-link" type="button" data-family-act="apply" data-id="${item.id}">
                      ${lang === "vi" ? "Áp dụng" : "Apply"}
                    </button>
                  </div>
                  <div style="height:8px;"></div>
                  <div class="mn-h2" style="margin:0;font-size:16px;">${title}</div>
                  <div class="mn-sub" style="margin-top:8px;">${body}</div>
                  <div style="height:12px;"></div>
                  <div class="mn-actions">
                    <button class="mn-act" type="button" data-family-act="helpful" data-id="${item.id}">
                      ${lang === "vi" ? "Hữu ích" : "Helpful"} <span>${item.helpful}</span>
                    </button>
                    <button class="mn-act" type="button" data-family-act="like" data-id="${item.id}">
                      ❤ <span>${item.likes}</span>
                    </button>
                    <button class="mn-act" type="button" data-family-act="advice" data-id="${item.id}">
                      ${lang === "vi" ? "AI gợi ý" : "AI idea"} <span>+</span>
                    </button>
                  </div>
                </div>
              </div>
            </article>
          `;
        })
        .join("");
    }

    function setFilter(filter) {
      state.filter = filter;
      state.items = sampleData(9, filter);
      render();
      const buttons = document.querySelectorAll("[data-family-tab]");
      buttons.forEach((b) => {
        b.classList.toggle("is-active", b.getAttribute("data-family-tab") === filter);
      });
    }

    // Tabs
    const tabButtons = document.querySelectorAll("[data-family-tab]");
    tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const key = button.getAttribute("data-family-tab") || "my";
        setFilter(key);
      });
    });

    // Composer + post
    const btnPost = document.getElementById("familyBtnPost");
    btnPost?.addEventListener("click", () => {
      const content = (composerText.value || "").trim();
      if (!content) {
        alert(readLang() === "vi" ? "Hãy viết nội dung trước khi đăng." : "Write something before posting.");
        return;
      }

      const id = chainId("family");
      const lang = readLang();
      const itemType = state.filter === "all" ? "my" : state.filter;
      const item = {
        id,
        type: itemType,
        titleVi: content.slice(0, 42) || "Bài chia sẻ",
        titleEn: content.slice(0, 42) || "A share",
        bodyVi: content.slice(0, 240),
        bodyEn: content.slice(0, 240),
        ts: Date.now(),
        likes: 0,
        helpful: 0,
        applied: false
      };

      state.items = [item, ...state.items];
      render();
      composerText.value = "";
      const composerResult = document.getElementById("familyComposerResult");
      if (composerResult) {
        composerResult.style.display = "block";
        composerResult.textContent = lang === "vi" ? "Đã tạo bài demo. (chưa lưu server)" : "Demo post created. (not saved server-side)";
      }
    });

    // Actions (delegate)
    document.addEventListener("click", (event) => {
      const button = event.target && event.target.closest ? event.target.closest("[data-family-act]") : null;
      if (!button) return;

      const action = button.getAttribute("data-family-act") || "";
      const id = button.getAttribute("data-id") || "";
      if (!action || !id) return;

      const item = state.items.find((entry) => entry.id === id);
      if (!item) return;

      const lang = readLang();
      if (action === "helpful") {
        item.helpful += 1;
        render();
        return;
      }
      if (action === "like") {
        item.likes += 1;
        render();
        return;
      }
      if (action === "apply") {
        item.applied = true;
        render();
        return;
      }
      if (action === "advice") {
        alert(
          lang === "vi"
            ? "AI demo: tóm tắt vấn đề -> nhận diện cảm xúc -> đề xuất 3 bước thực tế -> gom các phản hồi tương tự."
            : "AI demo: summarize -> detect emotions -> propose 3 practical steps -> cluster similar responses."
        );
      }
    }, { passive: true });

    // Initial render
    state.items = sampleData(9, state.filter);
    render();

    // Re-render bilingual dynamic content on language switch.
    window.addEventListener("mn_lang_changed", () => {
      render();
    });
  }

  function setupFamilyToolsPage() {
    const resultBox = document.getElementById("familyToolResult");
    const runBtn = document.getElementById("familyToolRun");
    const input = document.getElementById("familyToolInput");
    if (!resultBox || !runBtn || !input) return;

    runBtn.addEventListener("click", () => {
      const lang = readLang();
      const raw = (input.value || "").trim();
      if (!raw) {
        resultBox.textContent = lang === "vi" ? "Nhập mô tả tình huống để AI gợi ý." : "Describe your situation for AI suggestions.";
        return;
      }

      const tool = document.getElementById("familyToolType")?.value || "parenting";
      const summaryVi = "Tóm tắt: ";
      const summaryEn = "Summary: ";

      const ideas = {
        parenting: {
          vi: [
            "Chia nhỏ buổi học thành 15–20 phút + nghỉ ngắn.",
            "Thiết lập phần thưởng không vật chất (ví dụ: quyền chọn hoạt động).",
            "Ghi lại 3 dấu hiệu cải thiện trong 7 ngày."
          ],
          en: [
            "Split study into 15–20 minute blocks with short breaks.",
            "Use non-material rewards (e.g., let them choose an activity).",
            "Track 3 improvement signals over the next 7 days."
          ]
        },
        conflict: {
          vi: [
            "Xác định nhu cầu chính (an toàn, tôn trọng, tự chủ).",
            "Chọn 1 câu ‘nói từ cảm xúc’ thay vì tranh luận đúng/sai.",
            "Thống nhất 1 thử nghiệm nhỏ trong 24 giờ."
          ],
          en: [
            "Identify the core need (safety, respect, autonomy).",
            "Use one ‘I-feel’ sentence instead of right/wrong debate.",
            "Agree on one small experiment within 24 hours."
          ]
        },
        finance: {
          vi: [
            "Ước lượng 3 khoản lớn nhất tháng này.",
            "Lập ngân sách 50/30/20 và gắn mục tiêu ổn định.",
            "Chọn 1 khoản cắt giảm không làm tổn thương giá trị gia đình."
          ],
          en: [
            "Estimate your 3 biggest expenses this month.",
            "Draft a 50/30/20 budget aligned with stability goals.",
            "Cut one cost without harming family values."
          ]
        },
        schedule: {
          vi: [
            "Tạo lịch sinh hoạt theo ‘nhịp sáng – nhịp học – nhịp tối’.",
            "Ưu tiên giờ chất lượng với trẻ và với nhau.",
            "Đặt quy tắc ‘một việc quan trọng/ một việc nhẹ’ mỗi ngày."
          ],
          en: [
            "Create a daily rhythm: morning – study – evening.",
            "Prioritize quality time for kids and for each other.",
            "Use a rule: one important task + one light task daily."
          ]
        }
      };

      const toolIdeas = ideas[tool] || ideas.parenting;
      const list = (lang === "vi" ? toolIdeas.vi : toolIdeas.en).map((x) => `• ${x}`).join("\n");

      const header = lang === "vi" ? summaryVi : summaryEn;
      resultBox.textContent = `${header}${raw}\n\n${lang === "vi" ? "Gợi ý thực tế:\n" : "Practical ideas:\n"}${list}\n\n${
        lang === "vi" ? "Lưu ý: demo UI, chưa nối backend." : "Note: demo UI only, not connected to backend."
      }`;
    });
  }

  function setupFamilyProfilePage() {
    const form = document.getElementById("familyProfileForm");
    if (!form) return;

    const saveBtn = document.getElementById("familyProfileSave");
    const result = document.getElementById("familyProfileResult");
    const key = "mn_family_profile_demo";

    function load() {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return;
        const data = JSON.parse(raw);
        const set = (id, value) => {
          const el = document.getElementById(id);
          if (el && value != null) el.value = String(value);
        };
        set("familyProfileName", data.name);
        set("familyProfileValues", data.values);
        set("familyProfileGoal", data.goal);
      } catch {}
    }

    load();

    saveBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      const lang = readLang();
      try {
        const data = {
          name: document.getElementById("familyProfileName")?.value || "",
          values: document.getElementById("familyProfileValues")?.value || "",
          goal: document.getElementById("familyProfileGoal")?.value || ""
        };
        localStorage.setItem(key, JSON.stringify(data));
        if (result) {
          result.style.display = "block";
          result.textContent = lang === "vi" ? "Đã lưu demo Family Profile (local)." : "Saved demo Family Profile (local).";
        }
      } catch {}
    });
  }

  function init() {
    restoreLegacyAppTheme();
    setupJoinPage();
    setupFeedPage();
    setupCreatePage();
    setupComplaintsPage();
    setupFamilyFeedPage();
    setupFamilyToolsPage();
    setupFamilyProfilePage();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
