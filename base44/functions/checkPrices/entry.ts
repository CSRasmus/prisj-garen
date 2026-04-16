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
    return true;
  }
  return false;
}

async function fetchAndSavePrice(base44, product, globalUpdatedAsins) {
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

  // Save to GlobalPriceHistory (deduplicated per ASIN per day)
  if (!globalUpdatedAsins.has(product.asin)) {
    const saved = await saveToGlobalHistory(base44, product.asin, price, currency, now);
    if (saved) globalUpdatedAsins.add(product.asin);
  }

  // Import historical data from Rainforest into GlobalPriceHistory (once per ASIN per run)
  if (!globalUpdatedAsins.has(`hist:${product.asin}`)) {
    const rawHistory = (p.price_history || []).filter(h => h.date && h.price && new Date(h.date) >= cutoff);
    if (rawHistory.length > 0) {
      const existingGlobal = await base44.asServiceRole.entities.GlobalPriceHistory.filter(
        { asin: product.asin, amazon_domain: "amazon.se" }, "-checked_at", 500
      );
      const existingGlobalDates = new Set(existingGlobal.map(h => h.checked_at?.substring(0, 10)));
      for (const point of rawHistory) {
        if (!existingGlobalDates.has(point.date?.substring(0, 10))) {
          await base44.asServiceRole.entities.GlobalPriceHistory.create({
            asin: product.asin,
            price: parseFloat(point.price),
            currency,
            checked_at: new Date(point.date).toISOString(),
            amazon_domain: "amazon.se",
          });
        }
      }
    }
    globalUpdatedAsins.add(`hist:${product.asin}`);
  }

  // Save to user's PriceHistory
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
  await base44.asServiceRole.entities.PriceHistory.create({ product_id: product.id, price, currency, checked_at: now });

  // Compute 90d stats from GlobalPriceHistory for this ASIN
  const globalHistory = await base44.asServiceRole.entities.GlobalPriceHistory.filter(
    { asin: product.asin, amazon_domain: "amazon.se" }, "-checked_at", 500
  );
  const allPrices = [...globalHistory.map(h => h.price), price].filter(v => v > 0);
  const lowestPrice = Math.min(...allPrices);
  const highestPrice = Math.max(...allPrices);
  const isLowPrice = price <= lowestPrice * 1.05;

  const updateData = { current_price: price, currency, lowest_price_90d: lowestPrice, highest_price_90d: highestPrice, is_low_price: isLowPrice, last_checked: now };
  if (p.main_image?.link) updateData.image_url = p.main_image.link;

  await base44.asServiceRole.entities.Product.update(product.id, updateData);

  // Determine trigger: target price OR automatic low-price logic
  const hasTargetPrice = product.target_price && product.target_price > 0;
  const priceTrigger = hasTargetPrice ? price <= product.target_price : isLowPrice;
  const shouldNotify = priceTrigger && product.notify_on_drop && product.created_by;
  let notified = false;

  if (shouldNotify) {
    const lastNotified = product.last_notified ? new Date(product.last_notified) : null;
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const alreadyNotifiedRecently = lastNotified && lastNotified > twentyFourHoursAgo;

    if (!alreadyNotifiedRecently) {
      const appUrl = `https://prisfall.se/product/${product.id}`;
      const amazonUrl = `https://www.amazon.se/dp/${product.asin}?tag=priskoll-21`;
      const shareText = encodeURIComponent(`🔥 Prisfall på Amazon!\n\n${product.title} är nu ${price} kr!\n\nHitta fler deals: https://prisfall.se`);
      const whatsappUrl = `https://wa.me/?text=${shareText}`;
      const smsUrl = `sms:?body=${shareText}`;
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: product.created_by,
        subject: `${hasTargetPrice ? "🎯 Ditt målpris är nått" : "🔥 Lågt pris"} på ${product.title}! — Prisfall`,
        body: `
          <div style="font-family: sans-serif; max-width: 600px; color: #222;">
            <h2 style="color: #2d9a5f;">${hasTargetPrice ? "🎯 Ditt målpris är nått" : "🔥 Lågt pris"} på ${product.title}! (Prisfall)</h2>
            <p>${hasTargetPrice ? `Priset har sjunkit under ditt målpris på ${product.target_price} kr!` : "Priset har sjunkit till en rekordlåg nivå de senaste 90 dagarna!"}</p>
            <table style="border-collapse: collapse; margin: 16px 0;">
              <tr><td style="padding: 4px 12px 4px 0; color: #666;">Nuvarande pris:</td><td style="font-weight: bold; font-size: 1.2em; color: #2d9a5f;">${price} ${currency}</td></tr>
              <tr><td style="padding: 4px 12px 4px 0; color: #666;">Lägst 90 dagar:</td><td>${lowestPrice} ${currency}</td></tr>
              <tr><td style="padding: 4px 12px 4px 0; color: #666;">Högst 90 dagar:</td><td>${highestPrice} ${currency}</td></tr>
            </table>
            <div style="margin-top: 20px; display: flex; gap: 12px; flex-wrap: wrap;">
              <a href="${amazonUrl}" style="display: inline-block; background: #2d9a5f; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Köp nu på Amazon →</a>
              <a href="${appUrl}" style="display: inline-block; background: #f0f0f0; color: #333; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Visa i Prisfall</a>
            </div>
            <div style="margin-top: 24px; padding: 16px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px; font-size: 14px; color: #555; font-weight: 600;">📣 Dela detta deal med en vän</p>
              <a href="${whatsappUrl}" style="display: inline-block; background: #25D366; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 13px; margin-right: 8px;">WhatsApp</a>
              <a href="${smsUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 13px;">SMS</a>
            </div>
            <p style="color: #aaa; font-size: 12px; margin-top: 24px;">Prisfall – Din prisbevakning för Amazon.se</p>
          </div>
        `
      });
      await base44.asServiceRole.entities.Product.update(product.id, { last_notified: now });
      notified = true;
      console.log(`Notified ${product.created_by} about low price on ${product.asin}`);

      // Send web push notification if user has a subscription
      try {
        const subscriptions = await base44.asServiceRole.entities.PushSubscription.filter(
          { created_by: product.created_by },
          "-created_date",
          1
        );
        if (subscriptions.length > 0) {
          const sub = subscriptions[0];
          const subObj = JSON.parse(sub.subscription_json);
          const pushTitle = "🔥 Prisfall på Amazon!";
          const pushBody = `${product.title} är nu ${price} kr`;
          const pushData = {
            title: pushTitle,
            body: pushBody,
            tag: `price-drop-${product.id}`,
            badge: "https://prisfall.se/favicon.ico",
             data: { url: `https://prisfall.se/product/${product.id}` }
          };
          console.log(`Sending web push to ${product.created_by} for ${product.asin}`);
          // Note: Web push requires a VAPID key and push service integration
          // This is a placeholder for future implementation
        }
      } catch (pushErr) {
        console.log(`Could not send web push: ${pushErr.message}`);
      }
    } else {
      console.log(`Skipping notification for ${product.asin} — already notified within 24h`);
    }
  }

  return { price, isLowPrice, notified };
}

const CRON_SECRET = Deno.env.get("CRON_SECRET");

Deno.serve(async (req) => {
  try {
    // Allow Base44 internal scheduler (no secret needed) OR external calls with correct secret
    if (CRON_SECRET) {
      const url = new URL(req.url);
      const provided = url.searchParams.get("secret");
      if (provided !== CRON_SECRET) {
        console.warn("checkPrices: unauthorized call blocked");
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const base44 = createClientFromRequest(req);
    const products = await base44.asServiceRole.entities.Product.list();

    if (products.length === 0) {
      console.log("No products to update.");
      return Response.json({ message: 'No products to update', updated: 0, total: 0 });
    }

    let updated = 0;
    const errors = [];
    const globalUpdatedAsins = new Set(); // Track which ASINs already got GlobalPriceHistory update this run

    for (const product of products) {
      try {
        await fetchAndSavePrice(base44, product, globalUpdatedAsins);
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