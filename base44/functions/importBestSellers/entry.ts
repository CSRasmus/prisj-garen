import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const EASYPARSER_API_KEY = Deno.env.get("EASYPARSER_API_KEY");

// 8 categories — try BEST_SELLERS first via category_id, fall back to SEARCH with queries
const CATEGORIES = [
  {
    name: "Husdjur",
    emoji: "🐶",
    slug: "husdjur",
    category_id: "2454166031",
    queries: ["hundmat", "kattmat", "hundleksak"],
  },
  {
    name: "Elektronik",
    emoji: "🔌",
    slug: "elektronik",
    category_id: "2454155031",
    queries: ["hörlurar", "smartwatch", "laddare"],
  },
  {
    name: "Hem & kök",
    emoji: "🏠",
    slug: "hem-kok",
    category_id: "2454158031",
    queries: ["nespresso", "kaffemaskin", "köksmaskin"],
  },
  {
    name: "Barnprodukter",
    emoji: "👶",
    slug: "barn",
    category_id: "2454152031",
    queries: ["pampers", "barnmat", "bilstol"],
  },
  {
    name: "Sport & fritid",
    emoji: "🎮",
    slug: "sport",
    category_id: "2454167031",
    queries: ["yogamatta", "löparskor", "träningsband"],
  },
  {
    name: "Böcker",
    emoji: "📚",
    slug: "bocker",
    category_id: "2454153031",
    queries: ["bestseller bok", "barnbok", "deckare"],
  },
  {
    name: "Hälsa",
    emoji: "🍎",
    slug: "halsa",
    category_id: "2454157031",
    queries: ["vitamin", "kosttillskott", "protein"],
  },
  {
    name: "Trädgård",
    emoji: "🌱",
    slug: "tradgard",
    category_id: "2454168031",
    queries: ["trädgårdsredskap", "blomkruka", "grill"],
  },
];

const PRODUCTS_PER_CATEGORY = 10;

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

async function fetchBestSellers(category_id) {
  const data = await easyparserRequest({
    api_key: EASYPARSER_API_KEY,
    platform: "AMZ",
    domain: ".se",
    operation: "BEST_SELLERS",
    category_id,
    output: "json",
  });
  return data.result?.best_sellers || data.result?.bestsellers || [];
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

function extractFromBSR(item) {
  const asin = item.asin || item.ASIN;
  const title = item.title || item.name;
  const image_url = buildImageUrl(item.image || item.image_url || item.main_image?.link);
  const priceRaw = item.price?.value ?? item.price?.raw ?? item.price ?? item.buybox_winner?.price?.value ?? null;
  return { asin, title, image_url, price: parsePrice(priceRaw) };
}

function extractFromSearch(item) {
  const asin = item.asin || item.ASIN;
  const title = item.title || item.name;
  const image_url = buildImageUrl(item.image || item.image_url || item.thumbnail);
  const priceRaw = item.price?.value ?? item.price?.raw ?? item.price ?? null;
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
      imported: 0,
      skipped: 0,
      errors: 0,
      api_calls: 0,
      per_category: {},
    };

    // Existing best-seller ASINs (skip dupes)
    const existing = await base44.asServiceRole.entities.BestSellerProduct.list("-imported_at", 2000);
    const existingAsins = new Set(existing.map(b => b.asin));
    log(`Existing BestSellerProducts: ${existingAsins.size}`);

    for (const cat of CATEGORIES) {
      log(`\n=== ${cat.emoji} ${cat.name} ===`);
      const catStat = { fetched: 0, imported: 0, skipped: 0, errors: 0, source: null };

      let items = [];

      // Try BEST_SELLERS first
      try {
        log(`Trying BEST_SELLERS (category_id=${cat.category_id})...`);
        result.api_calls++;
        items = await fetchBestSellers(cat.category_id);
        catStat.source = "best_sellers";
        log(`  → BSR returned ${items.length} items`);
      } catch (err) {
        log(`  → BSR failed: ${err.message}. Falling back to SEARCH.`);
      }

      // Fallback: SEARCH (combine results from each query)
      if (items.length === 0) {
        catStat.source = "search";
        const seenInCat = new Set();
        for (const q of cat.queries) {
          if (items.length >= PRODUCTS_PER_CATEGORY) break;
          try {
            log(`  SEARCH "${q}"...`);
            result.api_calls++;
            const r = await fetchSearch(q);
            for (const it of r) {
              const asin = it.asin || it.ASIN;
              if (asin && !seenInCat.has(asin)) {
                seenInCat.add(asin);
                items.push(it);
                if (items.length >= PRODUCTS_PER_CATEGORY) break;
              }
            }
          } catch (err) {
            log(`    → SEARCH "${q}" failed: ${err.message}`);
          }
          await new Promise(r => setTimeout(r, 800));
        }
      }

      catStat.fetched = items.length;

      // Take top N and import
      const top = items.slice(0, PRODUCTS_PER_CATEGORY);
      for (let i = 0; i < top.length; i++) {
        const raw = top[i];
        const { asin, title, image_url, price } = catStat.source === "best_sellers"
          ? extractFromBSR(raw)
          : extractFromSearch(raw);

        if (!asin || !title) {
          log(`  [${i + 1}/${top.length}] skipped (missing asin/title)`);
          catStat.skipped++;
          continue;
        }

        if (existingAsins.has(asin)) {
          log(`  [${i + 1}/${top.length}] ${asin} → skipped (already exists)`);
          catStat.skipped++;
          continue;
        }

        if (!price || price < 1 || price > 100000) {
          log(`  [${i + 1}/${top.length}] ${asin} → skipped (invalid price: ${price})`);
          catStat.skipped++;
          existingAsins.add(asin);
          continue;
        }

        try {
          const now = new Date().toISOString();
          // Save BestSellerProduct
          await base44.asServiceRole.entities.BestSellerProduct.create({
            asin,
            title,
            image_url: image_url || null,
            current_price: price,
            currency: "SEK",
            category: cat.name,
            category_emoji: cat.emoji,
            category_slug: cat.slug,
            current_rank: i + 1,
            source: catStat.source,
            imported_at: now,
            active: true,
          });

          // Seed GlobalPriceHistory with live price
          await base44.asServiceRole.entities.GlobalPriceHistory.create({
            asin,
            price,
            currency: "SEK",
            checked_at: now,
            amazon_domain: "amazon.se",
            source: "live",
          });

          existingAsins.add(asin);
          catStat.imported++;
          log(`  [${i + 1}/${top.length}] ✅ ${asin} — ${title.substring(0, 50)} (${price} SEK)`);
        } catch (err) {
          log(`  [${i + 1}/${top.length}] ${asin} → ERROR: ${err.message}`);
          catStat.errors++;
        }
      }

      result.imported += catStat.imported;
      result.skipped += catStat.skipped;
      result.errors += catStat.errors;
      result.per_category[cat.name] = catStat;

      log(`  Subtotal: ${catStat.imported} imported, ${catStat.skipped} skipped, ${catStat.errors} errors (source: ${catStat.source})`);

      // Small pause between categories
      await new Promise(r => setTimeout(r, 1000));
    }

    log(`\n=== DONE ===`);
    log(`Total: ${result.imported} imported, ${result.skipped} skipped, ${result.errors} errors`);
    log(`API credits used: ~${result.api_calls}`);

    return Response.json({ success: true, ...result, logs });
  } catch (error) {
    console.error("importBestSellers fatal:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});