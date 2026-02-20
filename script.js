(function () {
  const AUTO_INTERVAL_MS = 4500;
  const PLACEHOLDER_IMAGES = [
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
  ];

  function escapeHtml(s) {
    if (s == null || s === "") return "";
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function specRow(label, value) {
    if (value == null || value === "") return "";
    const isPrice = label === "賃料";
    const val = typeof value === "boolean" ? (value ? "あり" : "なし") : String(value);
    return `<dt>${escapeHtml(label)}</dt><dd${isPrice ? ' class="price"' : ""}>${escapeHtml(val)}</dd>`;
  }

  function badges(item) {
    const b = [];
    if (item.gas) b.push(`<span class="badge badge-gas">${escapeHtml(item.gas)}</span>`);
    if (item.stove !== null && item.stove !== undefined)
      b.push(`<span class="badge badge-stove">コンロ${item.stove ? "あり" : "なし"}</span>`);
    if (item.ac !== null && item.ac !== undefined)
      b.push(`<span class="badge badge-ac">エアコン${item.ac ? "あり" : "なし"}</span>`);
    if (item.internet)
      b.push(`<span class="badge badge-net">ネット${escapeHtml(item.internet)}</span>`);
    return b.length ? `<div class="card-badges">${b.join("")}</div>` : "";
  }

  function nearestStationLabel(item) {
    const station = item.nearestStation || (item.access && item.access.match(/([^\s]+駅)/) && item.access.match(/([^\s]+駅)/)[1]);
    let min = item.walkMinutes;
    if (min == null && item.access) {
      const m = item.access.match(/徒歩\s*(\d+)\s*分/);
      if (m) min = parseInt(m[1], 10);
    }
    if (!station) return min != null ? `徒歩${min}分` : "";
    return min != null ? `${station}（徒歩${min}分）` : station;
  }

  function renderCard(item, index) {
    const imgs = item.images && item.images.length > 0 ? item.images : PLACEHOLDER_IMAGES;
    const slides = imgs
      .map(
        (src, i) =>
          `<img src="${escapeHtml(src)}" alt="${escapeHtml(item.name)} ${i + 1}" loading="lazy" />`
      )
      .join("\n");

    const nearestLabel = nearestStationLabel(item);
    const specs = [
      specRow("賃料", item.price),
      specRow("間取り", item.layout),
      specRow("専有面積", item.area),
      specRow("構造", item.structure),
      specRow("アクセス", item.access),
      nearestLabel ? specRow("最寄り駅", nearestLabel) : "",
      specRow("最寄→志賀本通駅", item.shigaAccess),
      specRow("最寄→名古屋駅", item.nagoyaAccess),
      specRow("最寄→土岐市（岐阜）", item.tokishiAccess),
      specRow("インターネット", item.internet),
      specRow("備考", item.note),
    ]
      .filter(Boolean)
      .join("");

    const titleName = item.buildingName || item.name;
    const subtitleHtml = nearestLabel ? `<p class="card-nearest">${escapeHtml(nearestLabel)}</p>` : "";

    return `
      <article class="card" data-area="${escapeHtml(item.name)}">
        <div class="card-images">
          <div class="carousel" data-carousel="${index}">
            <button type="button" class="carousel-btn prev" aria-label="前へ">‹</button>
            <div class="carousel-track">
              <div class="carousel-slides">${slides}</div>
            </div>
            <button type="button" class="carousel-btn next" aria-label="次へ">›</button>
            <div class="carousel-dots" data-dots="${index}"></div>
          </div>
        </div>
        <div class="card-body">
          <h2 class="card-area">${escapeHtml(titleName)}</h2>
          ${subtitleHtml}
          ${badges(item)}
          <dl class="card-specs">${specs}</dl>
          <a href="${escapeHtml(item.url)}" class="link" target="_blank" rel="noopener">詳細を見る</a>
        </div>
      </article>`;
  }

  function initCarousel(container) {
    const slides = container.querySelector(".carousel-slides");
    const imgs = slides ? slides.querySelectorAll("img") : [];
    const prevBtn = container.querySelector(".carousel-btn.prev");
    const nextBtn = container.querySelector(".carousel-btn.next");
    const dotsContainer = container.querySelector(".carousel-dots");
    const total = imgs.length;
    if (total === 0) return;

    let index = 0;
    let autoTimer = null;

    function render() {
      slides.style.transform = `translateX(-${index * 100}%)`;
      dotsContainer.querySelectorAll(".dot").forEach((d, i) => {
        d.classList.toggle("active", i === index);
      });
    }

    function goTo(i) {
      index = ((i % total) + total) % total;
      render();
      resetAuto();
    }

    function resetAuto() {
      if (autoTimer) clearInterval(autoTimer);
      autoTimer = setInterval(() => goTo(index + 1), AUTO_INTERVAL_MS);
    }

    for (let i = 0; i < total; i++) {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "dot" + (i === 0 ? " active" : "");
      dot.setAttribute("aria-label", "スライド " + (i + 1));
      dot.addEventListener("click", () => goTo(i));
      dotsContainer.appendChild(dot);
    }

    if (prevBtn) prevBtn.addEventListener("click", () => goTo(index - 1));
    if (nextBtn) nextBtn.addEventListener("click", () => goTo(index + 1));

    render();
    resetAuto();
  }

  fetch("data.json")
    .then((r) => {
      if (!r.ok) throw new Error(r.statusText);
      return r.json();
    })
    .then((data) => {
      const app = document.getElementById("app");
      app.innerHTML = data.map((item, i) => renderCard(item, i)).join("");
      document.querySelectorAll(".carousel").forEach(initCarousel);
    })
    .catch((err) => {
      document.getElementById("app").innerHTML =
        '<p class="loading">データの読み込みに失敗しました。ビルド（<code>npm run build</code>）を実行して data.json を生成してください。</p>';
      console.error(err);
    });

  // 右下ボタン：クリックで一番上にスムーススクロール
  var scrollTopBtn = document.getElementById("scroll-top-btn");
  if (scrollTopBtn) {
    scrollTopBtn.addEventListener("click", function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
})();
