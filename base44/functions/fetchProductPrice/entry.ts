import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const EASYPARSER_API_KEY = Deno.env.get("EASYPARSER_API_KEY");

async function fetchEasyparserProduct(asin) {
  const doFetch = () => {
    const params = new URLSearchParams({ api_key: EASYPARSER_API_KEY, platform: "AMZ", domain: ".se", asin, output: "json", operation: "DETAIL" });
    return fetch(`https://realtime.easyparser.com/v1/request?${params}`);
  };

  let res = await doFetch();
  if (!res.ok) {
    console.warn(`Easyparser ${res.status} for ${asin}, retrying...`);
    await new Promise(r => setTimeout(r, 3000));
    res = await doFetch();
    if (!res.ok) throw new Error(`Easyparser HTTP ${res.status}`);
  }
  const data = await res.json();
  console.log(`Easyparser request_info for ${asin}:`, JSON.stringify(data.request_info));
  if (data.request_info?.status_code === 404 || !data.result?.detail) {
    throw new Error(`Produkten hittades inte på Amazon.se (ASIN: ${asin})`);
  }
  if (!data.request_info?.success) {
    throw new Error(`Easyparser: ${JSON.stringify(data.request_info?.error_details || data.request_info).substring(0, 200)}`);
  }
  return data.result.detail;
}

const ninetyDaysAgo = () => {
  const d = new Date();
  d.setDate(d.getDate() - 90);
  return d;
};

// Save to GlobalPriceHistory — one entry per ASIN per day
async function saveToGlobalHistory(base44, asin, price, currency, now) {
  const today = now.substring(0, 10);
  const existing = await base44.asServiceRole.entities.GlobalPriceHistory.filter(
    { asin, amazon_domain: "amazon.se" }, "-checked_at", 5
  );
  const alreadySavedToday = existing.some(h => h.checked_at?.substring(0, 10) === today);
  if (!alreadySavedToday) {
    await base44.asServiceRole.entities.GlobalPriceHistory.create({
      asin, price, currency, checked_at: now, amazon_domain: "amazon.se"
    });
  }
}

// Bulk-insert historical points into GlobalPriceHistory (deduped by day)
async function seedGlobalHistory(base44, asin, rawHistory, currency) {
  const existingGlobal = await base44.asServiceRole.entities.GlobalPriceHistory.filter(
    { asin, amazon_domain: "amazon.se" }, "-checked_at", 500
  );
  const existingGlobalDates = new Set(existingGlobal.map(h => h.checked_at?.substring(0, 10)));
  const newGlobal = rawHistory.filter(h => !existingGlobalDates.has(h.date?.substring(0, 10)));
  for (const point of newGlobal) {
    await base44.asServiceRole.entities.GlobalPriceHistory.create({
      asin,
      price: parseFloat(point.price),
      currency,
      checked_at: new Date(point.date).toISOString(),
      amazon_domain: "amazon.se",
    });
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { product_id, asin } = await req.json();
    if (!asin) return Response.json({ error: 'ASIN required' }, { status: 400 });

    console.log(`Fetching price via Easyparser for ASIN: ${asin}`);

    const product = await fetchEasyparserProduct(asin);

    // Debug: log exact price fields
    console.log("buybox_winner:", JSON.stringify(product.buybox_winner));
    console.log("product.price:", JSON.stringify(product.price));
    console.log("product.rrp:", JSON.stringify(product.rrp));

    const priceRaw = product.buybox_winner?.price?.value ?? product.price?.value ?? product.rrp?.value ?? null;
    // Handle both "2,171.49" (thousands separator) and "2 171,49" (European style)
    const price = priceRaw !== null
      ? parseFloat(String(priceRaw).replace(/\s/g, "").replace(/,(\d{3})/g, "$1").replace(",", "."))
      : NaN;
    console.log("priceRaw:", priceRaw, "-> parsed:", price);

    if (!price || price < 1 || price > 100000) throw new Error(`Invalid price: ${priceRaw} -> ${price}`);

    const currency = "SEK";
    const now = new Date().toISOString();
    console.log(`Got price: ${price} SEK for ${asin}`);

    if (!product_id) return Response.json({ success: true, price, currency });

    // Easyparser does not provide price_history — seed today only
    await saveToGlobalHistory(base44, asin, price, currency, now);

    // Save to user's PriceHistory
    await base44.entities.PriceHistory.create({ product_id, price, currency, checked_at: now });

    // Compute 90d stats from all available global data for this ASIN
    const globalHistory = await base44.asServiceRole.entities.GlobalPriceHistory.filter(
      { asin, amazon_domain: "amazon.se" }, "-checked_at", 500
    );
    const allPrices = [...globalHistory.map(h => h.price), price].filter(p => p > 0);
    const lowestPrice = Math.min(...allPrices);
    const highestPrice = Math.max(...allPrices);
    const isLowPrice = price <= lowestPrice * 1.05;

    const updateData = {
      current_price: price,
      currency,
      lowest_price_90d: lowestPrice,
      highest_price_90d: highestPrice,
      is_low_price: isLowPrice,
      last_checked: now,
    };
    const imageUrl = product.main_image?.link || product.images?.[0]?.link;
    if (imageUrl) updateData.image_url = imageUrl;

    await base44.entities.Product.update(product_id, updateData);
    console.log(`Saved to DB. isLow=${isLowPrice} low90=${lowestPrice} high90=${highestPrice}`);

    return Response.json({ success: true, price, currency });
  } catch (error) {
    console.error("fetchProductPrice error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});