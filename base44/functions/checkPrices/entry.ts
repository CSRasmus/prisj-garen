import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const EASYPARSER_API_KEY = Deno.env.get("EASYPARSER_API_KEY");
// NOTE: RAINFOREST_API_KEY is no longer used and can be removed from Base44 environment variables.

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
  const doFetch = () => {
    const params = new URLSearchParams({ api_key: EASYPARSER_API_KEY, platform: "AMZ", domain: ".se", asin: product.asin, output: "json", operation: "DETAIL" });
    return fetch(`https://realtime.easyparser.com/v1/request?${params}`);
  };

  let res = await doFetch();
  if (!res.ok) {
    console.warn(`Easyparser ${res.status} for ${product.asin}, retrying...`);
    await new Promise(r => setTimeout(r, 3000));
    res = await doFetch();
    if (!res.ok) throw new Error(`Easyparser HTTP ${res.status}`);
  }
  const data = await res.json();
  console.log(`Easyparser for ${product.asin}: success=${data.request_info?.success} status=${data.request_info?.status_code}`);
  if (!data.request_info?.success || data.request_info?.status_code === 404 || !data.result?.detail) {
    throw new Error(`Easyparser: ${JSON.stringify(data.request_info?.error_details || data.request_info).substring(0, 200)}`);
  }
  const p = data.result.detail;

  const priceRaw = p.buybox_winner?.price?.value ?? p.price?.value ?? p.rrp?.value ?? null;
  const price = priceRaw !== null
    ? parseFloat(String(priceRaw).replace(/\s/g, "").replace(/,(\d{3})/g, "$1").replace(",", "."))
    : NaN;
  if (!price || price < 1 || price > 100000) throw new Error(`Invalid price: ${price}`);

  const currency = "SEK";
  const now = new Date().toISOString();

  // Save today's price to GlobalPriceHistory (deduplicated per ASIN per day)
  if (!globalUpdatedAsins.has(product.asin)) {
    const saved = await saveToGlobalHistory(base44, product.asin, price, currency, now);
    if (saved) globalUpdatedAsins.add(product.asin);
  }

  // Save to user's PriceHistory
  await base44.asServiceRole.entities.PriceHistory.create({ product_id: product.id, price, currency, checked_at: now });

  // Compute 90d stats from GlobalPriceHistory for this ASIN
  const globalHistory = await base44.asServiceRole.entities.GlobalPriceHistory.filter(
    { asin: product.asin, amazon_domain: "amazon.se" }, "-checked_at", 500
  );
  const allPrices = [...globalHistory.map(h => h.price), price].filter(v => v > 0);
  const lowestPrice = Math.min(...allPrices);
  const highestPrice = Math.max(...allPrices);
  const avgPrice = Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length);
  const isLowPrice = price <= lowestPrice * 1.05;

  const percentFromAvg = avgPrice > 0 ? ((avgPrice - price) / avgPrice) * 100 : 0;

  const imageUrl = p.main_image?.link || p.images?.[0]?.link || product.image_url || null;
  const updateData = { current_price: price, currency, lowest_price_90d: lowestPrice, highest_price_90d: highestPrice, is_low_price: isLowPrice, last_checked: now };
  if (imageUrl) updateData.image_url = imageUrl;

  await base44.asServiceRole.entities.Product.update(product.id, updateData);

  const hasTargetPrice = product.target_price && product.target_price > 0;
  const meetsTargetPrice = hasTargetPrice && price <= product.target_price;
  const meetsPctThreshold = !hasTargetPrice && percentFromAvg >= 5;
  const qualifies = (meetsTargetPrice || meetsPctThreshold) && product.notify_on_drop && product.created_by;

  return { price, isLowPrice, avgPrice, lowestPrice, highestPrice, percentFromAvg, qualifies, hasTargetPrice, currency, imageUrl };
}

// Build HTML for a single product row in the summary email
function buildProductRow(product, result) {
  const amazonUrl = `https://www.amazon.se/dp/${product.asin}?tag=priskoll-21`;
  const appUrl = `https://prisfall.se/product/${product.id}`;
  const discount = result.avgPrice > 0
    ? Math.round(((result.avgPrice - result.price) / result.avgPrice) * 100)
    : 0;
  const imageHtml = result.imageUrl
    ? `<img src="${result.imageUrl}" width="80" height="80" style="object-fit:contain;border-radius:8px;background:#f9fafb;padding:4px" />`
    : `<div style="width:80px;height:80px;background:#16a34a;border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:28px">${product.title.charAt(0)}</div>`;

  const badgeText = product.target_price && product.target_price > 0
    ? `🎯 Målpris nått`
    : `-${discount}% under normalpriser`;

  return `
    <div style="border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:12px 0;display:flex;gap:16px;align-items:flex-start;background:#fff">
      ${imageHtml}
      <div style="flex:1">
        <strong style="display:block;margin-bottom:6px;font-size:15px">${product.title}</strong>
        <span style="color:#16a34a;font-size:1.4em;font-weight:bold">${result.price} kr</span>
        <span style="color:#9ca3af;text-decoration:line-through;margin-left:8px;font-size:0.9em">${result.avgPrice} kr</span>
        <br/>
        <span style="background:#dcfce7;color:#16a34a;padding:3px 8px;border-radius:4px;font-size:0.8em;display:inline-block;margin-top:6px">${badgeText}</span>
        <br/>
        <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
          <a href="${amazonUrl}" style="background:#16a34a;color:white;padding:8px 16px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:13px">Köp nu på Amazon →</a>
          <a href="${appUrl}" style="background:#f3f4f6;color:#333;padding:8px 16px;border-radius:6px;text-decoration:none;font-size:13px">Visa i Prisfall</a>
        </div>
      </div>
    </div>`;
}

const LOGO_URL = "https://media.base44.com/images/public/69e0849cd5247ba1a2f9090f/ab8f118b8_generated_image.png";

async function sendSummaryEmail(base44, userEmail, qualifiedProducts, totalWatched) {
  const count = qualifiedProducts.length;
  const subject = count === 1
    ? `🔥 Prisfall på ${qualifiedProducts[0].product.title}!`
    : `🔥 ${count} nya prisfall på dina bevakade produkter!`;

  const productRows = qualifiedProducts.map(({ product, result }) => buildProductRow(product, result)).join("");

  const siteUrl = "https://prisfall.se";
  const shareText = `Kolla in dessa prisfall på Amazon.se via Prisfall: ${siteUrl}`;
  const mailtoUrl = `mailto:?subject=${encodeURIComponent("Kolla in dessa prisfall!")}&body=${encodeURIComponent(shareText)}`;
  const smsUrl = `sms:?&body=${encodeURIComponent(shareText)}`;
  const messengerUrl = `https://www.facebook.com/dialog/send?app_id=140586622674265&link=${encodeURIComponent(siteUrl)}&redirect_uri=${encodeURIComponent(siteUrl)}`;
  const copyUrl = `${siteUrl}?utm_source=email&utm_medium=share`;

  const shareBtn = (href, label) => `<a href="${href}" style="display:inline-block;background:#f3f4f6;color:#111827;padding:12px 16px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;margin:4px;min-width:120px;text-align:center;line-height:1.2">${label}</a>`;

  const body = `
<!DOCTYPE html>
<html lang="sv"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f4f7f6;font-family:'Helvetica Neue',Arial,sans-serif;color:#222">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f6;padding:24px 12px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07)">
        <tr><td style="padding:28px 24px 8px;text-align:center">
          <img src="${LOGO_URL}" width="80" height="80" alt="Prisfall" style="display:inline-block;border-radius:12px;background:#fff"/>
          <p style="color:#6b7280;margin:8px 0 0;font-size:13px">Prisbevakning för Amazon.se</p>
        </td></tr>

        <tr><td style="padding:8px 24px 0">
          <h2 style="margin:8px 0 16px;font-size:1.2em;color:#111827">${subject.replace(/^🔥 /, '')}</h2>
          ${productRows}
        </td></tr>

        <tr><td style="padding:16px 24px 8px">
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px;text-align:center">
            <p style="margin:0 0 12px;font-size:14px;color:#374151;font-weight:600">📣 Dela dessa deals med en vän</p>
            <div>
              ${shareBtn(copyUrl, "📋 Kopiera länk")}
              ${shareBtn(mailtoUrl, "✉️ E-post")}
              ${shareBtn(smsUrl, "💬 SMS")}
              ${shareBtn(messengerUrl, "📱 Messenger")}
            </div>
          </div>
        </td></tr>

        <tr><td style="padding:16px 24px 28px;text-align:center">
          <p style="color:#6b7280;font-size:13px;margin:0 0 6px">
            Du bevakar ${totalWatched} produkt${totalWatched !== 1 ? 'er' : ''} på Prisfall.se
          </p>
          <a href="${siteUrl}/dashboard" style="color:#16a34a;text-decoration:none;font-weight:600;font-size:13px">Logga in på Prisfall.se →</a>
          <p style="color:#d1d5db;font-size:11px;margin:16px 0 0">Du får detta från Prisfall (prisfall.se)</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  await base44.asServiceRole.integrations.Core.SendEmail({
    to: userEmail,
    from_name: "Prisfall",
    subject,
    body,
  });
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
    const globalUpdatedAsins = new Set();

    // Map: userEmail -> { qualifiedProducts: [{product, result}], totalWatched: number }
    const userNotifyMap = {};

    for (let i = 0; i < products.length; i++) {
      const product = products[i];

      // Track total watched per user
      if (product.created_by) {
        if (!userNotifyMap[product.created_by]) {
          userNotifyMap[product.created_by] = { qualifiedProducts: [], totalWatched: 0 };
        }
        userNotifyMap[product.created_by].totalWatched++;
      }

      try {
        const result = await fetchAndSavePrice(base44, product, globalUpdatedAsins);
        updated++;
        console.log(`Updated ${product.asin} (${updated}/${products.length}) — qualifies: ${result.qualifies}`);

        if (result.qualifies && product.created_by) {
          userNotifyMap[product.created_by].qualifiedProducts.push({ product, result });
        }
      } catch (err) {
        console.error(`Failed to update ${product.asin}: ${err.message}`);
        errors.push({ asin: product.asin, error: err.message });
      }

      // Rate limit: 2s between requests
      if (i < products.length - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    // Send one summary email per user (24h cooldown per user)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let emailsSent = 0;

    // Fetch all users to check last_notified on user level
    const allUsers = await base44.asServiceRole.entities.User.list();
    const userMap = {};
    for (const u of allUsers) {
      userMap[u.email] = u;
    }

    for (const [userEmail, { qualifiedProducts, totalWatched }] of Object.entries(userNotifyMap)) {
      if (qualifiedProducts.length === 0) continue;

      // Check user-level 24h cooldown
      const user = userMap[userEmail];

      const lastNotified = user?.last_notified ? new Date(user.last_notified) : null;
      if (lastNotified && lastNotified > twentyFourHoursAgo) {
        console.log(`Skipping email to ${userEmail} — already notified within 24h`);
        continue;
      }

      await sendSummaryEmail(base44, userEmail, qualifiedProducts, totalWatched);

      // Update last_notified on user record
      if (user) {
        await base44.asServiceRole.entities.User.update(user.id, { last_notified: new Date().toISOString() });
      }

      emailsSent++;
      console.log(`Sent summary email to ${userEmail} with ${qualifiedProducts.length} deals`);
    }

    const msg = `Daily price update complete: ${updated}/${products.length} products updated, ${emailsSent} summary emails sent`;
    console.log(msg);
    return Response.json({ message: msg, updated, total: products.length, emailsSent, errors });
  } catch (error) {
    console.error("checkPrices fatal error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});