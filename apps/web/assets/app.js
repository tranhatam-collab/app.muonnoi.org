(function () {
  "use strict";

  const mount = document.getElementById("homeMount");
  const y = document.getElementById("y");
  if (y) y.textContent = String(new Date().getFullYear());

  async function loadHome() {
    try {
      const res = await fetch("/assets/home.vi.html", { cache: "no-store" });
      if (!res.ok) throw new Error("fetch_failed");
      const html = await res.text();
      mount.innerHTML = html;
    } catch (e) {
      mount.innerHTML = `
        <section class="hero">
          <div class="hero__inner">
            <h1 class="brand__name">Muon Noi</h1>
            <p class="hero__lead">
              Khong tai duoc noi dung gioi thieu. Vui long thu lai hoac kiem tra duong dan /assets/home.vi.html.
            </p>
          </div>
        </section>
      `;
    }
  }

  loadHome();
})();
