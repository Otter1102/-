/**
 * Limited Nagoya 物件ページをスクレイピングし、data.json を生成する。
 * ルートに置く想定。取得失敗時は sources.json の fallback を使用。
 */

const fs = require("fs");
const path = require("path");

const OUT_DIR = process.cwd();
const SOURCES_PATH = path.join(OUT_DIR, "sources.json");
const DATA_PATH = path.join(OUT_DIR, "data.json");

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
  const nearLabel = text.match(/間取り\s*[：:]*\s*(\d?\s*LDK|\d?\s*DK|\d?\s*K|ワンルーム)/);
  if (nearLabel) return nearLabel[1].replace(/\s/g, "");
  const m = text.match(/(\d?\s*LDK|\d?\s*DK|\d?\s*K|ワンルーム)/);
  return m ? m[1].replace(/\s/g, "") : null;
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

function parseNearestStationFromAccess(access) {
  if (!access || typeof access !== "string") return null;
  const m = access.match(/([^\s]+駅)/);
  return m ? m[1] : null;
}

function extractBuildingName($) {
  if (!$) return null;
  const title = $("title").text() || $('meta[property="og:title"]').attr("content") || "";
  const t = title.replace(/\s*[｜|\-–].*$/, "").trim();
  return t || null;
}

function extractGas($) {
  const text = $("body").text();
  if (/都市ガス/.test(text)) return "都市ガス";
  if (/プロパン|LPガス/.test(text)) return "プロパン";
  return null;
}

function extractStove($) {
  const text = $("body").text();
  if (/コンロ\s*[：:]\s*あり|コンロあり|ガスコンロ/.test(text)) return true;
  if (/コンロ\s*[：:]\s*なし|コンロなし/.test(text)) return false;
  if (/キッチン|バーナー/.test(text)) return true;
  return null;
}

function extractAc($) {
  const text = $("body").text();
  if (/エアコン\s*[：:]\s*あり|エアコンあり|エアコン\s*\(\d+台\)|冷暖房/.test(text)) return true;
  if (/エアコン\s*[：:]\s*なし|エアコンなし/.test(text)) return false;
  if (/冷房|暖房/.test(text)) return true;
  return null;
}

function extractInternet($) {
  const text = $("body").text();
  if (/インターネット\s*無料|無料\s*インターネット/.test(text)) return "無料";
  if (/CATVインターネット|光\s*インターネット|インターネット\s*あり|Wi-Fi|ワイファイ/.test(text)) return "あり";
  if (/インターネット\s*なし|インターネット\s*[：:]\s*なし/.test(text)) return "なし";
  return null;
}

function extractStructure($) {
  const text = $("body").text();
  if (/RC|鉄筋コンクリート| Reinforced/.test(text)) return "RC";
  if (/SRC|鉄骨鉄筋/.test(text)) return "SRC";
  if (/木造|W造/.test(text)) return "木造";
  if (/軽量鉄骨|S造/.test(text)) return "軽量鉄骨";
  return null;
}

function extractWalkMinutes($) {
  const text = $("body").text();
  const m = text.match(/徒歩\s*(\d+)\s*分|最寄[り駅].*?(\d+)\s*分/);
  if (m) return parseInt(m[1] || m[2], 10);
  return null;
}

function extractShigaAccess($) {
  const text = $("body").text();
  const m = text.match(/志賀本通[駅]?[^\d]*(\d+)\s*分|志賀本[^\d]*(\d+)\s*分/);
  if (m) return "志賀本通駅まで " + (m[1] || m[2]) + "分";
  if (/志賀本通/.test(text)) return "志賀本通駅 記載あり";
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
    buildingName: fallback.buildingName ?? null,
    nearestStation: fallback.nearestStation ?? null,
    price: fallback.price ?? null,
    layout: fallback.layout ?? null,
    area: fallback.area ?? null,
    access: fallback.access ?? null,
    note: fallback.note ?? null,
    gas: fallback.gas ?? null,
    stove: fallback.stove ?? null,
    ac: fallback.ac ?? null,
    structure: fallback.structure ?? null,
    walkMinutes: fallback.walkMinutes ?? null,
    shigaAccess: fallback.shigaAccess ?? null,
    nagoyaAccess: fallback.nagoyaAccess ?? null,
    tokishiAccess: fallback.tokishiAccess ?? null,
    internet: fallback.internet ?? null,
    images: [],
  };
  if (!html) {
    item.nearestStation = item.nearestStation || parseNearestStationFromAccess(item.access);
    return item;
  }
  const $ = parseWithCheerio(html);
  if (!$) {
    item.nearestStation = item.nearestStation || parseNearestStationFromAccess(item.access);
    return item;
  }
  item.price = extractPrice($) ?? item.price;
  const scrapedLayout = extractLayout($);
  if (scrapedLayout && scrapedLayout !== "K") item.layout = scrapedLayout;
  else if (fallback.layout) item.layout = fallback.layout;
  item.area = extractArea($) ?? item.area;
  item.access = extractAccess($) ?? item.access;
  item.gas = extractGas($) ?? item.gas;
  item.stove = extractStove($) ?? item.stove;
  item.ac = extractAc($) ?? item.ac;
  item.structure = extractStructure($) ?? item.structure;
  item.walkMinutes = extractWalkMinutes($) ?? item.walkMinutes;
  item.shigaAccess = extractShigaAccess($) ?? item.shigaAccess;
  item.nagoyaAccess = fallback.nagoyaAccess ?? null;
  item.tokishiAccess = fallback.tokishiAccess ?? null;
  item.internet = extractInternet($) ?? item.internet;
  item.images = extractImages($, source.url);
  item.nearestStation = item.nearestStation || parseNearestStationFromAccess(item.access);
  if (!item.buildingName) item.buildingName = extractBuildingName($) || null;
  return item;
}

async function main() {
  const sources = JSON.parse(fs.readFileSync(SOURCES_PATH, "utf8"));
  const data = [];
  for (const s of sources) {
    const nameAlreadyExists = data.some((d) => d.name === s.name);
    if (nameAlreadyExists) {
      console.log(`Skip (duplicate name): ${s.name}`);
      continue;
    }
    process.stdout.write(`Scraping ${s.name}... `);
    try {
      const item = await scrapeOne(s);
      if (data.some((d) => d.name === item.name)) {
        console.log(`Skip (duplicate name): ${item.name}`);
        continue;
      }
      data.push(item);
      console.log(`OK (images: ${(item.images && item.images.length) || 0})`);
    } catch (e) {
      console.log("Fallback (error: " + e.message + ")");
      const fb = s.fallback || {};
      const access = fb.access || null;
      data.push({
        name: s.name,
        url: s.url,
        buildingName: fb.buildingName || null,
        nearestStation: fb.nearestStation || parseNearestStationFromAccess(access),
        price: fb.price || null,
        layout: fb.layout || null,
        area: fb.area || null,
        access: access,
        note: fb.note || null,
        gas: fb.gas || null,
        stove: fb.stove ?? null,
        ac: fb.ac ?? null,
        structure: fb.structure || null,
        walkMinutes: fb.walkMinutes ?? null,
        shigaAccess: fb.shigaAccess || null,
        nagoyaAccess: fb.nagoyaAccess || null,
        tokishiAccess: fb.tokishiAccess || null,
        internet: fb.internet || null,
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
