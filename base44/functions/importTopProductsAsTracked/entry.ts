import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const EASYPARSER_API_KEY = Deno.env.get("EASYPARSER_API_KEY");

// Categories with broad search queries — SEARCH returns ~50 results per page on Amazon.se.
// To reach ~100 products per category we use 2 queries × 1 page each.
const CATEGORIES = [
  { name: "Husdjur",        emoji: "🐶", queries: ["hund", "katt"] },
  { name: "Elektronik",     emoji: "🔌", queries: ["hörlurar", "smartwatch"] },
  { name: "Hem & kök",      emoji: "🏠", queries: ["kaffemaskin", "köksmaskin"] },
  { name: "Barnprodukter",  emoji: "👶", queries: ["barn leksak", "blöjor"] },
  { name: "Sport & fritid", emoji: "🎮", queries: ["träning", "cykel"] },
  { name: "Böcker",         emoji: "📚", queries: ["bok bestseller", "deckare"] },
  { name: "Hälsa",          emoji: "🍎", queries: ["vitamin", "kosttillskott"] },
  { name: "Trädgård",       emoji: "🌱", queries: ["trädgård", "grill"] },
];

const PRODUCTS_PER_CATEGORY = 100;

async function easyparserRequest(params) {
  const url = `https://realtime.easyparser.com/v1/request?${new URLSearchParams(params)}`;
  const res = await fetch(url);
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.substring(0, 200)}`);
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`Bad JSON: ${text.substring(0, 200)}`); }
  if (!data.request_info?.success) {
    throw new Error(`API error: ${JSON.stringify(data.request_info).substring(0, 200)}`);
  }
  return data;
}

async function fetchSearch(keyword) {
  const data = await easyparserRequest({
    api_key: EASYPARSER_API_KEY,
    platform: "AMZ",
    domain: ".se",
    operation: "SEARCH",
    keyword,
    output: "json",
  });
  return data.result?.search_results || data.result?.results || [];
}

function buildImageUrl(raw) {
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://m.media-amazon.com/images/I/${raw}._AC_SL300_.jpg`;
}

function parsePrice(raw) {
  if (raw == null) return NaN;
  return parseFloat(String(raw).replace(/\s/g, "").replace(/,(\d{3})/g, "$1").replace(",", "."));
}

function extractItem(item) {
  const asin = item.asin || item.ASIN;
  const title = item.title || item.name;
  const image_url = buildImageUrl(item.image || item.image_url || item.thumbnail || item.main_image?.link);
  const priceRaw = item.price?.value ?? item.price?.raw ?? item.price ?? item.buybox_winner?.price?.value ?? null;
  return { asin, title, image_url, price: parsePrice(priceRaw) };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Forbidden: Admin only" }, { status: 403 });
    }

    const logs = [];
    const log = (msg) => { console.log(msg); logs.push(msg); };

    const result = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      api_calls: 0,
      per_category: {},
    };

    // Index existing Products by ASIN to avoid duplicates
    const existingProducts = await base44.asServiceRole.entities.Product.list("-created_date", 5000);
    const existingByAsin = new Map();
    for (const p of existingProducts) {
      if (p.asin) existingByAsin.set(p.asin, p);
    }
    log(`Existing Products in DB: ${existingProducts.length} (${existingByAsin.size} with ASIN)`);

    for (const cat of CATEGORIES) {
      log(`\n=== ${cat.emoji} ${cat.name} ===`);
      const catStat = { fetched: 0, created: 0, updated: 0, skipped: 0, errors: 0 };

      // Combine search results across this category's queries, dedupe by ASIN
      const seen = new Set();
      const items = [];
      for (const q of cat.queries) {
        if (items.length >= PRODUCTS_PER_CATEGORY) break;
        try {
          log(`  SEARCH "${q}"...`);
          result.api_calls++;
          const r = await fetchSearch(q);
          log(`  → "${q}" returned ${r.length} items`);
          for (const it of r) {
            const asin = it.asin || it.ASIN;
            if (asin && !seen.has(asin)) {
              seen.add(asin);
              items.push(it);
              if (items.length >= PRODUCTS_PER_CATEGORY) break;
            }
          }
        } catch (err) {
          log(`    → SEARCH "${q}" failed: ${err.message}`);
          catStat.errors++;
        }
        await new Promise(r => setTimeout(r, 800));
      }

      catStat.fetched = items.length;
      log(`  → Top ${items.length} unique ASINs`);

      // Build new products in bulk to reduce per-row overhead and avoid SDK rate limits
      const now = new Date().toISOString();
      const toCreate = [];
      const historyRows = [];

      for (let i = 0; i < items.length; i++) {
        const { asin, title, image_url, price } = extractItem(items[i]);

        if (!asin || !title) { catStat.skipped++; continue; }
        if (!price || price < 1 || price > 100000) { catStat.skipped++; continue; }

        const existing = existingByAsin.get(asin);
        if (existing) {
          // Skip — already tracked. Daily checkPrices will refresh price.
          catStat.skipped++;
          continue;
        }

        toCreate.push({
          title,
          asin,
          image_url: image_url || null,
          amazon_url: `https://www.amazon.se/dp/${asin}`,
          current_price: price,
          currency: "SEK",
          notify_on_drop: false,
          last_checked: now,
        });
        historyRows.push({
          asin, price, currency: "SEK", checked_at: now,
          amazon_domain: "amazon.se", source: "live",
        });
        existingByAsin.set(asin, { asin }); // mark as seen
      }

      // Bulk create in chunks of 25 with small pauses to stay under rate limits
      const CHUNK = 25;
      for (let i = 0; i < toCreate.length; i += CHUNK) {
        try {
          await base44.asServiceRole.entities.Product.bulkCreate(toCreate.slice(i, i + CHUNK));
          catStat.created += Math.min(CHUNK, toCreate.length - i);
        } catch (err) {
          log(`  Product.bulkCreate chunk ${i} failed: ${err.message}`);
          catStat.errors += Math.min(CHUNK, toCreate.length - i);
        }
        await new Promise(r => setTimeout(r, 600));
      }
      for (let i = 0; i < historyRows.length; i += CHUNK) {
        try {
          await base44.asServiceRole.entities.GlobalPriceHistory.bulkCreate(historyRows.slice(i, i + CHUNK));
        } catch (err) {
          log(`  GlobalPriceHistory.bulkCreate chunk ${i} failed: ${err.message}`);
        }
        await new Promise(r => setTimeout(r, 600));
      }

      result.created += catStat.created;
      result.updated += catStat.updated;
      result.skipped += catStat.skipped;
      result.errors += catStat.errors;
      result.per_category[cat.name] = catStat;

      log(`  Subtotal: ${catStat.created} new, ${catStat.updated} updated, ${catStat.skipped} skipped, ${catStat.errors} errors`);

      await new Promise(r => setTimeout(r, 1000));
    }

    log(`\n=== DONE ===`);
    log(`Total: ${result.created} new Products, ${result.updated} updated, ${result.skipped} skipped, ${result.errors} errors`);
    log(`API credits used: ~${result.api_calls}`);

    return Response.json({ success: true, ...result, logs });
  } catch (error) {
    console.error("importTopProductsAsTracked fatal:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});