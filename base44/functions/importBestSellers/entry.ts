import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const EASYPARSER_API_KEY = Deno.env.get("EASYPARSER_API_KEY");

// Amazon.se category IDs for BSR
const CATEGORIES = [
  { name: "Husdjur", category_id: "2454166031" },
  { name: "Elektronik", category_id: "2454155031" },
  { name: "Hem & kök", category_id: "2454158031" },
];

async function fetchBestSellers(category_id) {
  const params = new URLSearchParams({
    api_key: EASYPARSER_API_KEY,
    platform: "AMZ",
    domain: ".se",
    operation: "BEST_SELLERS",
    category_id,
    output: "json",
  });
  const res = await fetch(`https://realtime.easyparser.com/v1/request?${params}`);
  if (!res.ok) throw new Error(`BSR HTTP ${res.status}`);
  const data = await res.json();
  if (!data.request_info?.success) {
    throw new Error(`BSR error: ${JSON.stringify(data.request_info).substring(0, 200)}`);
  }
  return data.result?.best_sellers || [];
}

async function fetchProductDetail(asin) {
  const params = new URLSearchParams({
    api_key: EASYPARSER_API_KEY,
    platform: "AMZ",
    domain: ".se",
    asin,
    output: "json",
    operation: "DETAIL",
  });
  const res = await fetch(`https://realtime.easyparser.com/v1/request?${params}`);
  if (!res.ok) throw new Error(`Detail HTTP ${res.status}`);
  const data = await res.json();
  if (!data.request_info?.success || !data.result?.detail) {
    throw new Error(`Detail not found for ${asin}`);
  }
  return data.result.detail;
}

function parsePrice(raw) {
  if (raw == null) return NaN;
  return parseFloat(String(raw).replace(/\s/g, "").replace(/,(\d{3})/g, "$1").replace(",", "."));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Forbidden: Admin only" }, { status: 403 });
    }

    let imported = 0;
    let skipped = 0;
    let errors = 0;
    const logs = [];

    const log = (msg) => {
      console.log(msg);
      logs.push(msg);
    };

    // Collect all ASINs already in GlobalPriceHistory to skip duplicates
    log("Fetching existing ASINs from GlobalPriceHistory...");
    const existingHistory = await base44.asServiceRole.entities.GlobalPriceHistory.list("-checked_at", 2000);
    const existingAsins = new Set(existingHistory.map(h => h.asin));
    log(`Found ${existingAsins.size} existing ASINs`);

    // Gather all products from all categories
    const allProducts = [];
    for (const cat of CATEGORIES) {
      try {
        log(`Fetching BSR for ${cat.name} (category_id: ${cat.category_id})...`);
        const products = await fetchBestSellers(cat.category_id);
        log(`Got ${products.length} products for ${cat.name}`);
        for (const p of products) {
          if (p.asin) allProducts.push({ ...p, _category: cat.name });
        }
      } catch (err) {
        log(`ERROR fetching BSR for ${cat.name}: ${err.message}`);
        errors++;
      }
    }

    log(`Total products to process: ${allProducts.length}`);

    const now = new Date().toISOString();
    const today = now.substring(0, 10);

    for (let i = 0; i < allProducts.length; i++) {
      const p = allProducts[i];
      const asin = p.asin;

      log(`Processing ${i + 1}/${allProducts.length}: ${asin} (${p.title || p._category})`);

      // Skip if already tracked in GlobalPriceHistory
      if (existingAsins.has(asin)) {
        log(`  → Skipped (already exists)`);
        skipped++;
        continue;
      }

      try {
        // Fetch full product detail for price & image
        const detail = await fetchProductDetail(asin);
        const priceRaw = detail.buybox_winner?.price?.value ?? detail.price?.value ?? detail.rrp?.value ?? null;
        const price = parsePrice(priceRaw);

        if (!price || price < 1 || price > 100000) {
          log(`  → Skipped (invalid price: ${priceRaw} → ${price})`);
          skipped++;
          existingAsins.add(asin); // don't retry
          continue;
        }

        const title = detail.title || p.title || `Amazon ${asin}`;
        const imageUrl = detail.main_image?.link || detail.images?.[0]?.link || p.image || null;
        const amazonUrl = `https://www.amazon.se/dp/${asin}`;

        // Save to GlobalPriceHistory
        await base44.asServiceRole.entities.GlobalPriceHistory.create({
          asin,
          price,
          currency: "SEK",
          checked_at: now,
          amazon_domain: "amazon.se",
        });

        existingAsins.add(asin);
        imported++;
        log(`  → Imported: ${title} — ${price} SEK`);
      } catch (err) {
        log(`  → ERROR: ${err.message}`);
        errors++;
      }

      // Rate limit: 1s between requests
      if (i < allProducts.length - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    const summary = `Import complete: ${imported} imported, ${skipped} skipped, ${errors} errors`;
    log(summary);
    return Response.json({ success: true, imported, skipped, errors, logs });
  } catch (error) {
    console.error("importBestSellers fatal:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});