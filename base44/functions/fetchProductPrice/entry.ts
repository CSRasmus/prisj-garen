import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const RAINFOREST_API_KEY = Deno.env.get("RAINFOREST_API_KEY");

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

    console.log(`Fetching price + history via Rainforest API for ASIN: ${asin}`);

    const url = `https://api.rainforestapi.com/request?api_key=${RAINFOREST_API_KEY}&type=product&asin=${asin}&amazon_domain=amazon.se&include_price_history=true`;
    const response = await fetch(url);
    const data = await response.json();

    const product = data.product;
    if (!product) throw new Error(`Product not found: ${data.message || ''}`);

    const price = parseFloat(
      product.buybox_winner?.price?.value ||
      product.price?.value ||
      product.rrp?.value
    );
    if (!price || price < 1 || price > 100000) throw new Error(`Invalid price: ${price}`);

    const currency = "SEK";
    const now = new Date().toISOString();
    console.log(`Got price: ${price} SEK for ${asin}`);

    if (!product_id) return Response.json({ success: true, price, currency });

    // Build 90-day price history from Rainforest
    const cutoff = ninetyDaysAgo();
    const rawHistory = (product.price_history || []).filter(h => {
      if (!h.date || !h.price) return false;
      return new Date(h.date) >= cutoff;
    });

    console.log(`Got ${rawHistory.length} historical price points from Rainforest`);

    // Save historical points to GlobalPriceHistory (deduped)
    await seedGlobalHistory(base44, asin, rawHistory, currency);

    // Save today's price to GlobalPriceHistory
    await saveToGlobalHistory(base44, asin, price, currency, now);

    // Save to user's PriceHistory
    const existingHistory = await base44.entities.PriceHistory.filter({ product_id }, "-checked_at", 500);
    const existingDates = new Set(existingHistory.map(h => h.checked_at?.substring(0, 10)));

    const newPoints = rawHistory.filter(h => !existingDates.has(h.date?.substring(0, 10)));
    for (const point of newPoints) {
      await base44.entities.PriceHistory.create({
        product_id,
        price: parseFloat(point.price),
        currency,
        checked_at: new Date(point.date).toISOString(),
      });
    }
    await base44.entities.PriceHistory.create({ product_id, price, currency, checked_at: now });
    console.log(`Inserted ${newPoints.length} new historical price points`);

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
    if (product.main_image?.link) updateData.image_url = product.main_image.link;

    await base44.entities.Product.update(product_id, updateData);
    console.log(`Saved to DB. isLow=${isLowPrice} low90=${lowestPrice} high90=${highestPrice}`);

    return Response.json({ success: true, price, currency });
  } catch (error) {
    console.error("fetchProductPrice error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});