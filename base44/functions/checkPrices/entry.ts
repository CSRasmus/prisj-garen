import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const RAINFOREST_API_KEY = Deno.env.get("RAINFOREST_API_KEY");

const ninetyDaysAgo = () => {
  const d = new Date();
  d.setDate(d.getDate() - 90);
  return d;
};

async function fetchAndSavePrice(base44, product) {
  const url = `https://api.rainforestapi.com/request?api_key=${RAINFOREST_API_KEY}&type=product&asin=${product.asin}&amazon_domain=amazon.se&include_price_history=true`;
  const response = await fetch(url);
  const data = await response.json();

  const p = data.product;
  if (!p) throw new Error(`No product data: ${data.message || ''}`);

  const price = parseFloat(
    p.buybox_winner?.price?.value || p.price?.value || p.rrp?.value
  );
  if (!price || price < 1 || price > 100000) throw new Error(`Invalid price: ${price}`);

  const currency = "SEK";
  const now = new Date().toISOString();
  const cutoff = ninetyDaysAgo();

  // Import historical data from Rainforest
  const rawHistory = (p.price_history || []).filter(h => h.date && h.price && new Date(h.date) >= cutoff);
  const existingHistory = await base44.asServiceRole.entities.PriceHistory.filter({ product_id: product.id }, "-checked_at", 500);
  const existingDates = new Set(existingHistory.map(h => h.checked_at?.substring(0, 10)));

  const newPoints = rawHistory.filter(h => !existingDates.has(h.date?.substring(0, 10)));
  for (const point of newPoints) {
    await base44.asServiceRole.entities.PriceHistory.create({
      product_id: product.id,
      price: parseFloat(point.price),
      currency,
      checked_at: new Date(point.date).toISOString(),
    });
  }

  // Add today's price
  await base44.asServiceRole.entities.PriceHistory.create({ product_id: product.id, price, currency, checked_at: now });

  // Compute 90d stats
  const allPrices = [
    ...existingHistory.map(h => h.price),
    ...newPoints.map(pt => parseFloat(pt.price)),
    price
  ].filter(v => v > 0);

  const lowestPrice = Math.min(...allPrices);
  const highestPrice = Math.max(...allPrices);
  const isLowPrice = price <= lowestPrice * 1.05;

  const updateData = { current_price: price, currency, lowest_price_90d: lowestPrice, highest_price_90d: highestPrice, is_low_price: isLowPrice, last_checked: now };
  if (p.main_image?.link) updateData.image_url = p.main_image.link;

  await base44.asServiceRole.entities.Product.update(product.id, updateData);

  // Determine trigger: target price OR automatic low-price logic
  const hasTargetPrice = product.target_price && product.target_price > 0;
  const priceTrigger = hasTargetPrice ? price <= product.target_price : isLowPrice;

  // Send email if triggered, notifications enabled, and not already notified within 24h
  const shouldNotify = priceTrigger && product.notify_on_drop && product.created_by;
  let notified = false;

  if (shouldNotify) {
    const lastNotified = product.last_notified ? new Date(product.last_notified) : null;
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const alreadyNotifiedRecently = lastNotified && lastNotified > twentyFourHoursAgo;

    if (!alreadyNotifiedRecently) {
      const appUrl = `https://priskoll.base44.app/product/${product.id}`;
      const amazonUrl = `https://www.amazon.se/dp/${product.asin}?tag=priskoll-21`; // affiliate tag synced with affiliateUtils.js
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: product.created_by,
        subject: `${hasTargetPrice ? "🎯 Ditt målpris är nått" : "🔥 Lågt pris"} på ${product.title}!`,
        body: `
          <div style="font-family: sans-serif; max-width: 600px; color: #222;">
            <h2 style="color: #2d9a5f;">${hasTargetPrice ? "🎯 Ditt målpris är nått" : "🔥 Lågt pris"} på ${product.title}!</h2>
            <p>${hasTargetPrice ? `Priset har sjunkit under ditt målpris på ${product.target_price} kr!` : "Priset har sjunkit till en rekordlåg nivå de senaste 90 dagarna!"}</p>
            <table style="border-collapse: collapse; margin: 16px 0;">
              <tr><td style="padding: 4px 12px 4px 0; color: #666;">Nuvarande pris:</td><td style="font-weight: bold; font-size: 1.2em; color: #2d9a5f;">${price} ${currency}</td></tr>
              <tr><td style="padding: 4px 12px 4px 0; color: #666;">Lägst 90 dagar:</td><td>${lowestPrice} ${currency}</td></tr>
              <tr><td style="padding: 4px 12px 4px 0; color: #666;">Högst 90 dagar:</td><td>${highestPrice} ${currency}</td></tr>
            </table>
            <div style="margin-top: 20px; display: flex; gap: 12px; flex-wrap: wrap;">
              <a href="${amazonUrl}" style="display: inline-block; background: #2d9a5f; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Köp nu på Amazon →</a>
              <a href="${appUrl}" style="display: inline-block; background: #f0f0f0; color: #333; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Visa i PrisKoll</a>
            </div>
            <p style="color: #aaa; font-size: 12px; margin-top: 24px;">PrisKoll – Din prisbevakning för Amazon.se</p>
          </div>
        `
      });
      // Save last_notified to prevent spam
      await base44.asServiceRole.entities.Product.update(product.id, { last_notified: now });
      notified = true;
      console.log(`Notified ${product.created_by} about low price on ${product.asin}`);
    } else {
      console.log(`Skipping notification for ${product.asin} — already notified within 24h`);
    }
  }

  return { price, isLowPrice, notified };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const products = await base44.asServiceRole.entities.Product.list();

    if (products.length === 0) {
      console.log("No products to update.");
      return Response.json({ message: 'No products to update', updated: 0, total: 0 });
    }

    let updated = 0;
    const errors = [];

    for (const product of products) {
      try {
        await fetchAndSavePrice(base44, product);
        updated++;
        console.log(`Updated ${product.asin} (${updated}/${products.length})`);
      } catch (err) {
        console.error(`Failed to update ${product.asin}: ${err.message}`);
        errors.push({ asin: product.asin, error: err.message });
      }

      // Rate limit: 2s between requests
      if (products.indexOf(product) < products.length - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    const msg = `Daily price update complete: ${updated}/${products.length} products updated`;
    console.log(msg);
    return Response.json({ message: msg, updated, total: products.length, errors });
  } catch (error) {
    console.error("checkPrices fatal error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});