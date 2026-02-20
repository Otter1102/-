/**
 * Limited Nagoya 物件ページをスクレイピングし、data.json を生成する。
 * ビルド時に実行。取得失敗時は sources.json の fallback を使用。
 */

const fs = require("fs");
const path = require("path");

   const OUT_DIR = process.cwd();
const SOURCES_PATH = path.join(OUT_DIR, "sources.json");
const DATA_PATH = path.join(OUT_DIR, "data.json");

// Node 18+ の fetch、なければ dynamic import で node-fetch
async function loadFetch() {
  if (typeof globalThis.fetch === "function") return globalThis.fetch;
  const mod = await import("node-fetch");
  return mod.default;
}

async function fetchHtml(url) {
  const fetch = await loadFetch();
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "ja,en;q=0.9",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return null;
  return res.text();
}

function parseWithCheerio(html) {
  try {
    return require("cheerio").load(html);
  } catch {
    return null;
  }
}

function extractPrice($) {
  const text = $("body").text();
  const m = text.match(/(\d+)\s*万円/);
  if (m) return m[1] + "万円";
  const m2 = text.match(/(\d+)[〜\-～]\s*(\d+)\s*万円/);
  if (m2) return m2[1] + "〜" + m2[2] + "万円";
  return null;
}

function extractLayout($) {
  const text = $("body").text();
  const m = text.match(/(\d*LDK|\d*DK|\d*K|ワンルーム)/);
  return m ? m[1] : null;
}

function extractArea($) {
  const text = $("body").text();
  const m = text.match(/(\d+\.?\d*)\s*m²|専有[^\d]*(\d+\.?\d*)/);
  if (m) return (m[1] || m[2]) + "m²";
  return null;
}

function extractAccess($) {
  const text = $("body").text();
  const m = text.match(/([^\s]+(?:駅|バス停)?)\s*徒歩\s*(\d+)\s*分/);
  if (m) return m[1] + " 徒歩" + m[2] + "分";
  return null;
}

function extractImages($, baseUrl) {
  const imgs = [];
  const base = new URL(baseUrl).origin;

  $('meta[property="og:image"]').each((_, el) => {
    const v = $(el).attr("content");
    if (v && !imgs.includes(v)) imgs.push(v.startsWith("http") ? v : base + v);
  });

  $(".gallery img, .slide img, .room-photo img, .property-photo img, [class*='gallery'] img, [class*='slide'] img, main img, .detail img")
    .slice(0, 10)
    .each((_, el) => {
      let src = $(el).attr("src") || $(el).attr("data-src");
      if (src) {
        if (src.startsWith("//")) src = "https:" + src;
        else if (src.startsWith("/")) src = base + src;
        if (src.startsWith("http") && !imgs.includes(src)) imgs.push(src);
      }
    });

  return imgs.slice(0, 8);
}

async function scrapeOne(source) {
  const html = await fetchHtml(source.url);
  const fallback = source.fallback || {};
  const item = {
    name: source.name,
    url: source.url,
    price: fallback.price ?? null,
    layout: fallback.layout ?? null,
    area: fallback.area ?? null,
    access: fallback.access ?? null,
    note: fallback.note ?? null,
    images: [],
  };

  if (!html) return item;

  const $ = parseWithCheerio(html);
  if (!$) return item;

  item.price = extractPrice($) ?? item.price;
  item.layout = extractLayout($) ?? item.layout;
  item.area = extractArea($) ?? item.area;
  item.access = extractAccess($) ?? item.access;
  item.images = extractImages($, source.url);

  return item;
}

async function main() {
  const sources = JSON.parse(fs.readFileSync(SOURCES_PATH, "utf8"));
  const data = [];
  for (const s of sources) {
    process.stdout.write(`Scraping ${s.name}... `);
    try {
      const item = await scrapeOne(s);
      data.push(item);
      const imgCount = (item.images && item.images.length) || 0;
      console.log(`OK (images: ${imgCount})`);
    } catch (e) {
      console.log("Fallback (error: " + e.message + ")");
      data.push({
        name: s.name,
        url: s.url,
        price: (s.fallback && s.fallback.price) || null,
        layout: (s.fallback && s.fallback.layout) || null,
        area: (s.fallback && s.fallback.area) || null,
        access: (s.fallback && s.fallback.access) || null,
        note: (s.fallback && s.fallback.note) || null,
        images: [],
      });
    }
  }

  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), "utf8");
  console.log("Wrote " + DATA_PATH);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
