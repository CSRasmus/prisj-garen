import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const EASYPARSER_API_KEY = Deno.env.get("EASYPARSER_API_KEY");

// Same 8 Amazon.se categories as importBestSellers
const CATEGORIES = [
  { name: "Husdjur", emoji: "🐶", category_id: "2454166031" },
  { name: "Elektronik", emoji: "🔌", category_id: "2454155031" },
  { name: "Hem & kök", emoji: "🏠", category_id: "2454158031" },
  { name: "Barnprodukter", emoji: "👶", category_id: "2454152031" },
  { name: "Sport & fritid", emoji: "🎮", category_id: "2454167031" },
  { name: "Böcker", emoji: "📚", category_id: "2454153031" },
  { name: "Hälsa", emoji: "🍎", category_id: "2454157031" },
  { name: "Trädgård", emoji: "🌱", category_id: "2454168031" },
];

const PRODUCTS_PER_CATEGORY = 100;

async function easyparserRequest(params) {
  const url = `https://realtime.easyparser.com/v1/request?${new URLSearchParams(params)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data.request_info?.success) {
    throw new Error(`API error: ${JSON.stringify(data.request_info).substring(0, 200)}`);
  }
  return data;
}

async function fetchBestSellers(category_id, page = 1) {
  const data = await easyparserRequest({
    api_key: EASYPARSER_API_KEY,
    platform: "AMZ",
    domain: ".se",
    operation: "BEST_SELLERS",
    category_id,
    page: String(page),
    output: "json",
  });
  return data.result?.best_sellers || data.result?.bestsellers || [];
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
  const image_url = buildImageUrl(item.image || item.image_url || item.main_image?.link);
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

      // BEST_SELLERS returns ~50 per page → fetch 2 pages for top 100
      let items = [];
      for (let page = 1; page <= 2 && items.length < PRODUCTS_PER_CATEGORY; page++) {
        try {
          log(`  BEST_SELLERS page ${page}...`);
          result.api_calls++;
          const r = await fetchBestSellers(cat.category_id, page);
          log(`  → page ${page} returned ${r.length} items`);
          items = items.concat(r);
          await new Promise(r => setTimeout(r, 800));
        } catch (err) {
          log(`  → page ${page} failed: ${err.message}`);
          catStat.errors++;
        }
      }

      // Dedupe by ASIN within this category
      const seen = new Set();
      const top = [];
      for (const it of items) {
        const asin = it.asin || it.ASIN;
        if (asin && !seen.has(asin)) {
          seen.add(asin);
          top.push(it);
          if (top.length >= PRODUCTS_PER_CATEGORY) break;
        }
      }
      catStat.fetched = top.length;
      log(`  → Top ${top.length} unique ASINs`);

      for (let i = 0; i < top.length; i++) {
        const { asin, title, image_url, price } = extractItem(top[i]);

        if (!asin || !title) {
          catStat.skipped++;
          continue;
        }

        if (!price || price < 1 || price > 100000) {
          catStat.skipped++;
          continue;
        }

        try {
          const now = new Date().toISOString();
          const existing = existingByAsin.get(asin);

          if (existing) {
            // Already tracked — just refresh price/title/image
            await base44.asServiceRole.entities.Product.update(existing.id, {
              title,
              current_price: price,
              last_checked: now,
              ...(image_url ? { image_url } : {}),
            });
            catStat.updated++;
          } else {
            // Create as a tracked product (checkPrices will pick it up automatically)
            const created = await base44.asServiceRole.entities.Product.create({
              title,
              asin,
              image_url: image_url || null,
              amazon_url: `https://www.amazon.se/dp/${asin}`,
              current_price: price,
              currency: "SEK",
              notify_on_drop: false, // Admin-imported — no email notifications
              last_checked: now,
            });
            existingByAsin.set(asin, created);
            catStat.created++;
          }

          // Seed live datapoint for the buy-box price
          await base44.asServiceRole.entities.GlobalPriceHistory.create({
            asin,
            price,
            currency: "SEK",
            checked_at: now,
            amazon_domain: "amazon.se",
            source: "live",
          });
        } catch (err) {
          log(`  [${i + 1}] ${asin} → ERROR: ${err.message}`);
          catStat.errors++;
        }
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