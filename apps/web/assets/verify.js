(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

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

  function levelFor(score) {
    if (score >= 85) return 4;
    if (score >= 60) return 3;
    if (score >= 35) return 2;
    if (score > 0) return 1;
    return 0;
  }

  function rightsFor(level) {
    if (level >= 4) return "Org / Verified Pro";
    if (level >= 3) return "Shop/Pro, ưu tiên duyệt";
    if (level >= 2) return "Bán/hợp tác cơ bản";
    if (level >= 1) return "Đăng nhẹ";
    return "Chưa mở";
  }

  function antiSpamFor(level) {
    if (level >= 3) return "Nâng cao";
    if (level >= 1) return "Rate-limit theo lớp";
    return "Cơ bản";
  }

  function scoreSelected() {
    return $$("#checks input[type='checkbox']:checked").reduce((total, input) => {
      return total + Number(input.getAttribute("data-score") || 0);
    }, 0);
  }

  function renderScore(score) {
    const level = levelFor(score);
    const clamped = Math.min(100, Math.max(0, score));
    const levelText = `LEVEL ${level}`;

    const scoreText = $("#scoreText");
    const rightsText = $("#rightsText");
    const antiText = $("#antiText");
    const lvlPill = $("#lvlPill");
    const levelHint = $("#levelHint");

    if (scoreText) scoreText.textContent = `${clamped} / 100`;
    if (rightsText) rightsText.textContent = rightsFor(level);
    if (antiText) antiText.textContent = antiSpamFor(level);
    if (lvlPill) lvlPill.textContent = levelText;
    if (levelHint) levelHint.textContent = score > 0 ? `Đã tính: ${levelText}` : "Chưa tính";
  }

  function setNote(text) {
    const note = $("#note");
    const noteText = $("#noteText");
    if (noteText) noteText.textContent = text;
    if (note) note.style.display = "block";
  }

  function bind() {
    $("#btnGen")?.addEventListener("click", () => {
      const input = $("#who");
      if (input) input.value = chainId("mn");
      setNote("Đã tạo Verify ID demo. ID này chỉ dùng để kiểm tra giao diện local.");
    });

    $("#btnCheck")?.addEventListener("click", () => {
      const value = ($("#who")?.value || "").trim();
      if (!value) {
        setNote("Vui lòng nhập handle hoặc Verify ID trước khi kiểm tra.");
        return;
      }
      const looksLikeId = /^mn_[a-z0-9_]+$/i.test(value);
      setNote(looksLikeId ? "Verify ID demo hợp lệ về định dạng." : "Handle demo đã được nhận. Stage 2 sẽ kiểm tra qua Worker.");
    });

    $("#btnCalc")?.addEventListener("click", () => {
      renderScore(scoreSelected());
    });

    $("#btnReset")?.addEventListener("click", () => {
      $$("#checks input[type='checkbox']").forEach((input) => {
        input.checked = false;
      });
      const who = $("#who");
      if (who) who.value = "";
      renderScore(0);
      setNote("Đã reset demo xác minh.");
    });
  }

  function init() {
    renderScore(0);
    bind();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
