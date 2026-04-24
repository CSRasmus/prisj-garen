import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const EASYPARSER_API_KEY = Deno.env.get("EASYPARSER_API_KEY");
const CRON_SECRET = Deno.env.get("CRON_SECRET");

function parsePrice(raw) {
  if (raw == null) return null;
  if (typeof raw === "number") return raw;
  const cleaned = String(raw).replace(/\s/g, "").replace(/,(\d{3})/g, "$1").replace(",", ".").replace(/[^\d.]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

async function fetchFromEasyparser(asin) {
  const params = new URLSearchParams({
    api_key: EASYPARSER_API_KEY, platform: "AMZ", domain: ".se", asin, output: "json", operation: "DETAIL",
  });
  const doFetch = () => fetch(`https://realtime.easyparser.com/v1/request?${params}`);
  let res = await doFetch();
  if (!res.ok) {
    await new Promise(r => setTimeout(r, 3000));
    res = await doFetch();
    if (!res.ok) throw new Error(`Easyparser ${res.status}`);
  }
  const data = await res.json();
  if (!data.request_info?.success || data.request_info?.status_code === 404) throw new Error("Produkten hittades inte");
  const product = data.result?.detail;
  if (!product) throw new Error("Ingen produktdata");
  const priceRaw = product.buybox_winner?.price?.value ?? product.price?.value ?? null;
  const price = parsePrice(priceRaw);
  if (!price || price < 1) throw new Error(`Ogiltigt pris: ${priceRaw}`);
  return { title: product.title, image_url: product.main_image?.link || product.images?.[0]?.link || null, price };
}

async function saveToGlobalHistory(base44, asin, price, now) {
  const today = now.substring(0, 10);
  const existing = await base44.asServiceRole.entities.GlobalPriceHistory.filter({ asin }, "-checked_at", 5);
  const alreadySavedToday = existing.some(h => h.checked_at?.substring(0, 10) === today);
  if (!alreadySavedToday) {
    await base44.asServiceRole.entities.GlobalPriceHistory.create({
      asin, price, currency: "SEK", checked_at: now, amazon_domain: "amazon.se", shop_name: "Amazon.se",
    });
    return true;
  }
  return false;
}

async function fetchAndSavePrice(base44, product, globalUpdatedAsins) {
  const asin = product.asin;
  if (!asin) throw new Error("Saknar ASIN");
  const { price, image_url } = await fetchFromEasyparser(asin);
  const now = new Date().toISOString();

  if (!globalUpdatedAsins.has(asin)) {
    const saved = await saveToGlobalHistory(base44, asin, price, now);
    if (saved) globalUpdatedAsins.add(asin);
  }

  await base44.asServiceRole.entities.PriceHistory.create({ product_id: product.id, price, currency: "SEK", checked_at: now });

  const globalHistory = await base44.asServiceRole.entities.GlobalPriceHistory.filter({ asin, amazon_domain: "amazon.se" }, "-checked_at", 500);
  const allPrices = [...globalHistory.map(h => h.price), price].filter(v => v > 0);
  const lowestPrice90d = Math.min(...allPrices);
  const highestPrice90d = Math.max(...allPrices);
  const avgPrice = Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length);
  const isLowPrice = price <= lowestPrice90d * 1.05;
  const percentFromAvg = avgPrice > 0 ? ((avgPrice - price) / avgPrice) * 100 : 0;

  const updateData = {
    current_price: price, currency: "SEK",
    lowest_price_90d: lowestPrice90d, highest_price_90d: highestPrice90d,
    is_low_price: isLowPrice, last_checked: now,
  };
  if (image_url) updateData.image_url = image_url;
  await base44.asServiceRole.entities.Product.update(product.id, updateData);

  const hasTargetPrice = product.target_price && product.target_price > 0;
  const meetsTargetPrice = hasTargetPrice && price <= product.target_price;
  const meetsPctThreshold = !hasTargetPrice && percentFromAvg >= 5;
  const qualifies = (meetsTargetPrice || meetsPctThreshold) && product.notify_on_drop && product.created_by;

  return { price, isLowPrice, avgPrice, percentFromAvg, qualifies, hasTargetPrice, imageUrl: image_url };
}

function buildAmazonUrl(asin) {
  return `https://www.amazon.se/dp/${asin}?tag=priskoll-21`;
}

function buildProductRow(product, result) {
  const appUrl = `https://prisfall.se/product/${product.id}`;
  const buyUrl = buildAmazonUrl(product.asin);
  const discount = result.avgPrice > 0 ? Math.round(((result.avgPrice - result.price) / result.avgPrice) * 100) : 0;
  const imageHtml = result.imageUrl
    ? `<img src="${result.imageUrl}" width="80" height="80" style="object-fit:contain;border-radius:8px;background:#f9fafb;padding:4px" />`
    : `<div style="width:80px;height:80px;background:#16a34a;border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:28px">${product.title.charAt(0)}</div>`;
  const badgeText = product.target_price && product.target_price > 0 ? `🎯 Målpris nått` : `-${discount}% under genomsnittet`;
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
          <a href="${buyUrl}" style="background:#16a34a;color:white;padding:8px 16px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:13px">Köp på Amazon →</a>
          <a href="${appUrl}" style="background:#f3f4f6;color:#333;padding:8px 16px;border-radius:6px;text-decoration:none;font-size:13px">Visa i Prisfall</a>
        </div>
      </div>
    </div>`;
}

async function sendSummaryEmail(base44, userEmail, qualifiedProducts, totalWatched) {
  const count = qualifiedProducts.length;
  const subject = count === 1
    ? `🔥 Prisfall på ${qualifiedProducts[0].product.title}!`
    : `🔥 ${count} nya prisfall på dina bevakade produkter!`;
  const productRows = qualifiedProducts.map(({ product, result }) => buildProductRow(product, result)).join("");
  const shareText = encodeURIComponent(`🔥 Prisfall!\n\nHitta fler deals: https://prisfall.se`);
  const whatsappUrl = `https://wa.me/?text=${shareText}`;
  const body = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#222;background:#f9fafb;padding:24px;border-radius:16px">
      <div style="text-align:center;margin-bottom:24px">
        <h1 style="color:#16a34a;font-size:1.6em;margin:0">🔥 Prisfall</h1>
        <p style="color:#6b7280;margin:4px 0 0">Din prisbevakning på Amazon.se</p>
      </div>
      <div style="background:#fff;border-radius:12px;padding:20px;margin-bottom:16px;border:1px solid #e5e7eb">
        <h2 style="margin:0 0 16px;font-size:1.2em">${subject.replace(/^🔥 /, '')}</h2>
        ${productRows}
      </div>
      <div style="background:#fff;border-radius:12px;padding:16px;margin-bottom:16px;border:1px solid #e5e7eb;text-align:center">
        <p style="margin:0 0 12px;font-size:14px;color:#555;font-weight:600">📣 Dela dessa deals med en vän</p>
        <a href="${whatsappUrl}" style="background:#25D366;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:13px">WhatsApp</a>
      </div>
      <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px">
        Du bevakar ${totalWatched} produkt${totalWatched !== 1 ? 'er' : ''} totalt på Prisfall<br/>
        <a href="https://prisfall.se/dashboard" style="color:#16a34a;text-decoration:none">Hantera dina bevakningar →</a>
      </p>
      <p style="text-align:center;color:#d1d5db;font-size:11px;margin-top:8px">Prisfall — prisfall.se</p>
    </div>`;
  await base44.asServiceRole.integrations.Core.SendEmail({ to: userEmail, from_name: "Prisfall", subject, body });
}

Deno.serve(async (req) => {
  try {
    if (CRON_SECRET) {
      const url = new URL(req.url);
      const provided = url.searchParams.get("secret");
      if (provided !== CRON_SECRET) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!EASYPARSER_API_KEY) return Response.json({ error: "EASYPARSER_API_KEY saknas" }, { status: 500 });

    const base44 = createClientFromRequest(req);
    const products = await base44.asServiceRole.entities.Product.list();
    if (products.length === 0) return Response.json({ message: 'No products to update', updated: 0, total: 0 });

    let updated = 0;
    const errors = [];
    const globalUpdatedAsins = new Set();
    const userNotifyMap = {};

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      if (product.created_by) {
        if (!userNotifyMap[product.created_by]) userNotifyMap[product.created_by] = { qualifiedProducts: [], totalWatched: 0 };
        userNotifyMap[product.created_by].totalWatched++;
      }

      try {
        const result = await fetchAndSavePrice(base44, product, globalUpdatedAsins);
        updated++;
        if (result.qualifies && product.created_by) userNotifyMap[product.created_by].qualifiedProducts.push({ product, result });
      } catch (err) {
        console.error(`Failed ${product.asin}: ${err.message}`);
        errors.push({ asin: product.asin, error: err.message.substring(0, 200) });
      }
      if (i < products.length - 1) await new Promise(r => setTimeout(r, 2000));
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let emailsSent = 0;
    const allUsers = await base44.asServiceRole.entities.User.list();
    const userMap = {};
    for (const u of allUsers) userMap[u.email] = u;

    for (const [userEmail, { qualifiedProducts, totalWatched }] of Object.entries(userNotifyMap)) {
      if (qualifiedProducts.length === 0) continue;
      const user = userMap[userEmail];
      const lastNotified = user?.last_notified ? new Date(user.last_notified) : null;
      if (lastNotified && lastNotified > twentyFourHoursAgo) continue;
      await sendSummaryEmail(base44, userEmail, qualifiedProducts, totalWatched);
      if (user) await base44.asServiceRole.entities.User.update(user.id, { last_notified: new Date().toISOString() });
      emailsSent++;
    }

    const msg = `Price update: ${updated}/${products.length} updated, ${emailsSent} emails sent.`;
    console.log(msg);
    return Response.json({ message: msg, updated, total: products.length, emailsSent, errors });
  } catch (error) {
    console.error("checkPrices fatal:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});