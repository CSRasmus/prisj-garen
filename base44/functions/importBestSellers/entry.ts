import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const EASYPARSER_API_KEY = Deno.env.get("EASYPARSER_API_KEY");

// 8 categories — uses SEARCH (BEST_SELLERS operation is not supported on this account).
// Two broad queries per category combine to ~100 unique ASINs.
const CATEGORIES = [
  { name: "Husdjur",        emoji: "🐶", slug: "husdjur",        queries: ["hund", "katt"] },
  { name: "Elektronik",     emoji: "🔌", slug: "elektronik",     queries: ["hörlurar", "smartwatch"] },
  { name: "Hem & kök",      emoji: "🏠", slug: "hem-kok",        queries: ["kaffemaskin", "köksmaskin"] },
  { name: "Barnprodukter",  emoji: "👶", slug: "barn",           queries: ["barn leksak", "blöjor"] },
  { name: "Sport & fritid", emoji: "🎮", slug: "sport",          queries: ["träning", "cykel"] },
  { name: "Böcker",         emoji: "📚", slug: "bocker",         queries: ["bok bestseller", "deckare"] },
  { name: "Hälsa",          emoji: "🍎", slug: "halsa",          queries: ["vitamin", "kosttillskott"] },
  { name: "Trädgård",       emoji: "🌱", slug: "tradgard",       queries: ["trädgård", "grill"] },
];

const PRODUCTS_PER_CATEGORY = 100;
const DEAL_THRESHOLD = 0.05; // current_price within 5% of lowest_price_90d → flagged as deal

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

async function fetchPricingOffers(asin) {
  const data = await easyparserRequest({
    api_key: EASYPARSER_API_KEY,
    platform: "AMZ",
    domain: ".se",
    operation: "SALES_ANALYSIS_HISTORY",
    asin,
    output: "json",
    history_range: "0",
  });
  const offers = data.result?.product?.pricing?.offers || {};
  const min = Number(offers.new_offer_min_price);
  const max = Number(offers.new_offer_max_price);
  return {
    lowest_price_90d: min > 0 ? min : null,
    highest_price_90d: max > 0 ? max : null,
  };
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

function isDeal(price, low) {
  if (!price || !low) return false;
  return price <= low * (1 + DEAL_THRESHOLD);
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
      imported: 0,
      updated: 0,
      deactivated: 0,
      skipped: 0,
      errors: 0,
      deals_found: 0,
      api_calls: 0,
      per_category: {},
    };

    const existing = await base44.asServiceRole.entities.BestSellerProduct.list("-imported_at", 5000);
    const existingByAsin = new Map(existing.map(b => [b.asin, b]));
    log(`Existing BestSellerProducts: ${existingByAsin.size}`);

    for (const cat of CATEGORIES) {
      log(`\n=== ${cat.emoji} ${cat.name} ===`);
      const catStat = { fetched: 0, imported: 0, updated: 0, deactivated: 0, skipped: 0, errors: 0, deals: 0 };
      const seenInThisRun = new Set();

      // Combine SEARCH results from each query, dedupe by ASIN
      const items = [];
      const seen = new Set();
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
      log(`  → ${items.length} unique ASINs`);

      // Pre-process: validate and split into new vs existing
      const now = new Date().toISOString();
      const toCreate = [];
      const toUpdate = []; // { id, data }
      const historyRows = [];

      for (let i = 0; i < items.length; i++) {
        const { asin, title, image_url, price } = extractItem(items[i]);
        if (!asin || !title) { catStat.skipped++; continue; }
        if (!price || price < 1 || price > 100000) { catStat.skipped++; continue; }

        seenInThisRun.add(asin);

        // Fetch 90d range for deal detection (1 credit per ASIN)
        let priceRange = { lowest_price_90d: null, highest_price_90d: null };
        try {
          result.api_calls++;
          priceRange = await fetchPricingOffers(asin);
          await new Promise(r => setTimeout(r, 1500)); // Easyparser rate limit
        } catch (err) {
          log(`    pricing.offers ${asin} failed: ${err.message}`);
        }

        const deal = isDeal(price, priceRange.lowest_price_90d);
        if (deal) catStat.deals++;

        const existingProduct = existingByAsin.get(asin);
        const baseData = {
          title,
          current_price: price,
          current_rank: i + 1,
          category: cat.name,
          category_emoji: cat.emoji,
          category_slug: cat.slug,
          imported_at: now,
          active: true,
          is_deal: deal,
          lowest_price_90d: priceRange.lowest_price_90d,
          highest_price_90d: priceRange.highest_price_90d,
          ...(image_url ? { image_url } : {}),
        };

        if (existingProduct) {
          toUpdate.push({ id: existingProduct.id, data: baseData });
        } else {
          toCreate.push({
            asin,
            currency: "SEK",
            source: "search",
            image_url: image_url || null,
            ...baseData,
          });
        }

        historyRows.push({
          asin, price, currency: "SEK", checked_at: now,
          amazon_domain: "amazon.se", source: "live",
        });
      }

      // Bulk create new BestSellerProducts in chunks of 25
      const CHUNK = 25;
      for (let i = 0; i < toCreate.length; i += CHUNK) {
        try {
          await base44.asServiceRole.entities.BestSellerProduct.bulkCreate(toCreate.slice(i, i + CHUNK));
          catStat.imported += Math.min(CHUNK, toCreate.length - i);
        } catch (err) {
          log(`  BestSellerProduct.bulkCreate chunk ${i} failed: ${err.message}`);
          catStat.errors += Math.min(CHUNK, toCreate.length - i);
        }
        await new Promise(r => setTimeout(r, 600));
      }

      // Updates have to be one-by-one (no bulkUpdate). Add small pauses.
      for (const u of toUpdate) {
        try {
          await base44.asServiceRole.entities.BestSellerProduct.update(u.id, u.data);
          catStat.updated++;
        } catch (err) {
          log(`  Update ${u.id} failed: ${err.message}`);
          catStat.errors++;
        }
        await new Promise(r => setTimeout(r, 100));
      }

      // Bulk seed live price history
      for (let i = 0; i < historyRows.length; i += CHUNK) {
        try {
          await base44.asServiceRole.entities.GlobalPriceHistory.bulkCreate(historyRows.slice(i, i + CHUNK));
        } catch (err) {
          log(`  GlobalPriceHistory.bulkCreate chunk ${i} failed: ${err.message}`);
        }
        await new Promise(r => setTimeout(r, 600));
      }

      // Deactivate stale products in this category that didn't appear in this run
      for (const oldProd of existing) {
        if (oldProd.category_slug === cat.slug && oldProd.active && !seenInThisRun.has(oldProd.asin)) {
          try {
            await base44.asServiceRole.entities.BestSellerProduct.update(oldProd.id, { active: false });
            catStat.deactivated++;
          } catch (err) {
            log(`  Deactivation failed for ${oldProd.asin}: ${err.message}`);
          }
        }
      }

      result.imported += catStat.imported;
      result.updated += catStat.updated;
      result.deactivated += catStat.deactivated;
      result.skipped += catStat.skipped;
      result.errors += catStat.errors;
      result.deals_found += catStat.deals;
      result.per_category[cat.name] = { ...catStat, source: "search" };

      log(`  Subtotal: ${catStat.imported} new, ${catStat.updated} updated, ${catStat.deals} deals 🔥, ${catStat.deactivated} deactivated, ${catStat.skipped} skipped, ${catStat.errors} errors`);

      await new Promise(r => setTimeout(r, 1000));
    }

    log(`\n=== DONE ===`);
    log(`Total: ${result.imported} new, ${result.updated} updated, ${result.deals_found} deals 🔥, ${result.deactivated} deactivated, ${result.skipped} skipped, ${result.errors} errors`);
    log(`API credits used: ~${result.api_calls}`);

    return Response.json({ success: true, ...result, logs });
  } catch (error) {
    console.error("importBestSellers fatal:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});