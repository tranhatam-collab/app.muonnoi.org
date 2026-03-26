(() => {
  "use strict";

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));

  function readLang() {
    try {
      const saved = localStorage.getItem("mn_lang");
      return saved === "vi" ? "vi" : "en";
    } catch {
      return "en";
    }
  }

  function t(lang, vi, en) {
    return lang === "vi" ? vi : en;
  }

  function toB64(bytes) {
    const bin = String.fromCharCode(...bytes);
    return btoa(bin);
  }

  async function main() {
    const chatMessages = $("#chatMessages");
    const composer = $("#chatComposer");
    const sendBtn = $("#chatSendBtn");
    const toggleCipherBtn = $("#chatToggleCipher");
    const groupName = $("#chatGroupName");
    const createGroupBtn = $("#chatCreateGroupBtn");
    const joinCodeEl = $("#chatJoinCode");
    const callStatus = $("#chatCallStatus");
    const startAudioBtn = $("#chatStartAudioBtn");
    const startVideoBtn = $("#chatStartVideoBtn");
    const localVideo = $("#chatLocalVideo");

    if (!chatMessages || !composer || !sendBtn) return; // not a chat page

    let showCipher = false;
    let key = null;
    let messages = [];

    function genJoinCode() {
      const r = Math.random().toString(36).slice(2, 10).toUpperCase();
      return `MN-FAM-${r}`;
    }

    async function initE2EE() {
      // Demo-only: generate an ephemeral client key.
      // Production requires a real key exchange + ratchet + group key management.
      key = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
      );
    }

    function msgCard(item, lang) {
      const bubble = document.createElement("div");
      bubble.className = "mn-glass";
      bubble.style.borderRadius = "18px";
      bubble.style.padding = "12px";

      const header = document.createElement("div");
      header.className = "mn-sub";
      header.style.margin = "0";
      header.textContent = t(lang, "Bạn", "You") + " • " + new Date(item.ts).toLocaleTimeString();

      const body = document.createElement("div");
      body.className = "mn-h2";
      body.style.margin = "8px 0 0";
      body.style.fontSize = "14px";

      if (showCipher) {
        body.textContent = `cipher(base64): ${item.cipherB64}`;
      } else {
        body.textContent = item.plainText;
      }

      bubble.appendChild(header);
      bubble.appendChild(body);
      return bubble;
    }

    async function encryptText(plainText) {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encoded = new TextEncoder().encode(plainText);
      const buf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
      return { iv, buf };
    }

    async function decryptText(iv, buf) {
      const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, buf);
      return new TextDecoder().decode(plainBuf);
    }

    function render() {
      const lang = readLang();
      chatMessages.innerHTML = "";
      messages.forEach((m) => chatMessages.appendChild(msgCard(m, lang)));
    }

    createGroupBtn?.addEventListener("click", async () => {
      const lang = readLang();
      const name = (groupName.value || "").trim();
      if (!name) {
        alert(t(lang, "Nhập tên nhóm trước.", "Enter a group name first."));
        return;
      }
      joinCodeEl.textContent = genJoinCode();
      alert(t(lang, "Đã tạo nhóm (demo).", "Group created (demo)."));
    });

    toggleCipherBtn?.addEventListener("click", () => {
      showCipher = !showCipher;
      render();
    });

    sendBtn.addEventListener("click", async () => {
      const lang = readLang();
      const plain = (composer.value || "").trim();
      if (!plain) return;
      composer.value = "";

      try {
        const { iv, buf } = await encryptText(plain);
        const cipherB64 = toB64(new Uint8Array(buf));
        const plainText = await decryptText(iv, buf); // demo shows plaintext locally

        messages = [
          ...messages,
          {
            id: String(Date.now()),
            ts: Date.now(),
            plainText,
            cipherB64
          }
        ];
        render();
      } catch (e) {
        alert(t(lang, "Mã hóa thất bại (trình duyệt thiếu WebCrypto?).", "Encryption failed (WebCrypto unsupported?)."));
      }
    });

    async function startMedia(kind) {
      const lang = readLang();
      try {
        callStatus.textContent = t(lang, "Đang xin quyền media...", "Requesting media permission...");
        const stream = await navigator.mediaDevices.getUserMedia(kind);
        if (localVideo) {
          localVideo.hidden = false;
          localVideo.srcObject = stream;
        }
        callStatus.textContent = t(lang, "Đang preview (demo).", "Preview running (demo).");
      } catch (e) {
        callStatus.textContent = t(lang, "Không thể start media (demo).", "Cannot start media (demo).");
      }
    }

    startAudioBtn?.addEventListener("click", () => startMedia({ audio: true, video: false }));
    startVideoBtn?.addEventListener("click", () => startMedia({ audio: true, video: true }));

    // init
    await initE2EE();
    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", main);
  else main();
})();

