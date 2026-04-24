import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const APIFY_API_KEY = Deno.env.get("APIFY_API_KEY");
const ACTOR_ID = Deno.env.get("APIFY-PRISJAKT-ACTOR-ID");
const CRON_SECRET = Deno.env.get("CRON_SECRET");

// ---------- Shared Apify helpers ----------
async function runActor(input) {
  if (!APIFY_API_KEY) { const e = new Error("APIFY_API_KEY saknas"); e.code = "CONFIG"; throw e; }
  if (!ACTOR_ID) { const e = new Error("APIFY-PRISJAKT-ACTOR-ID saknas"); e.code = "CONFIG"; throw e; }
  const encodedActorId = ACTOR_ID.replace("/", "~");
  const url = `https://api.apify.com/v2/acts/${encodedActorId}/run-sync-get-dataset-items?token=${APIFY_API_KEY}&timeout=120`;
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  const responseText = await res.text();
  if (!res.ok) {
    let apifyError = null;
    try { apifyError = JSON.parse(responseText)?.error || null; } catch { /* noop */ }
    const err = new Error(`Apify ${res.status}: ${responseText.substring(0, 300)}`);
    err.status = res.status; err.apifyError = apifyError; err.rawBody = responseText;
    throw err;
  }
  return JSON.parse(responseText);
}

function classifyApifyError(err) {
  if (err.code === "CONFIG") return "APIFY_CONFIG_MISSING";
  const type = err.apifyError?.type;
  if (type === "not-enough-usage-to-run-paid-actor" || err.status === 402) return "APIFY_OUT_OF_CREDITS";
  if (err.status === 401 || err.status === 403) return "APIFY_AUTH_ERROR";
  if (err.status === 404) return "APIFY_ACTOR_NOT_FOUND";
  return "APIFY_UNKNOWN_ERROR";
}
// ---------- End shared helpers ----------

async function fetchPrisjaktPrices(pid) {
  const items = await runActor({ productId: pid, mode: "PRODUCT_DETAIL" });
  if (!items.length) throw new Error(`Ingen prisdata för: ${pid}`);
  const item = items[0];
  const shops = (item.offers || item.shops || item.prices || []).map(o => ({
    shop_name: o.shopName || o.shop_name || o.seller || o.name,
    shop_url: o.shopUrl || o.shop_url,
    price: typeof o.price === "number" ? o.price : parseFloat(String(o.price || "0").replace(/[^\d.]/g, "")),
    product_url: o.productUrl || o.product_url || o.url || o.buyUrl,
    in_stock: o.inStock ?? o.in_stock ?? true,
  })).filter(s => s.shop_name && s.price > 0);
  const prices = shops.map(s => s.price);
  const lowest_price = prices.length ? Math.min(...prices) : null;
  const lowest_shop = shops.find(s => s.price === lowest_price);
  return {
    shops,
    lowest_price,
    highest_price: prices.length ? Math.max(...prices) : null,
    lowest_shop_name: lowest_shop?.shop_name || null,
    lowest_shop_url: lowest_shop?.product_url || null,
    image_url: item.image || item.imageUrl || item.image_url || null,
  };
}

async function saveToGlobalHistory(base44, asin, price, shop_name, now) {
  const today = now.substring(0, 10);
  const existing = await base44.asServiceRole.entities.GlobalPriceHistory.filter({ asin }, "-checked_at", 5);
  const alreadySavedToday = existing.some(h => h.checked_at?.substring(0, 10) === today);
  if (!alreadySavedToday) {
    await base44.asServiceRole.entities.GlobalPriceHistory.create({
      asin, price, currency: "SEK", checked_at: now, amazon_domain: "prisjakt.nu", shop_name,
    });
    return true;
  }
  return false;
}

async function fetchAndSavePrice(base44, product, globalUpdatedPids) {
  const pid = product.prisjakt_id || product.asin;
  const data = await fetchPrisjaktPrices(pid);
  const { shops, lowest_price, lowest_shop_name, lowest_shop_url, image_url } = data;
  if (!lowest_price || lowest_price < 1) throw new Error(`Ogiltigt pris: ${lowest_price}`);

  const currency = "SEK";
  const now = new Date().toISOString();

  if (!globalUpdatedPids.has(pid)) {
    const saved = await saveToGlobalHistory(base44, pid, lowest_price, lowest_shop_name, now);
    if (saved) globalUpdatedPids.add(pid);
  }

  await base44.asServiceRole.entities.PriceHistory.create({ product_id: product.id, price: lowest_price, currency, checked_at: now });

  const globalHistory = await base44.asServiceRole.entities.GlobalPriceHistory.filter({ asin: pid }, "-checked_at", 500);
  const allPrices = [...globalHistory.map(h => h.price), lowest_price].filter(v => v > 0);
  const lowestPrice90d = Math.min(...allPrices);
  const highestPrice90d = Math.max(...allPrices);
  const avgPrice = Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length);
  const isLowPrice = lowest_price <= lowestPrice90d * 1.05;
  const percentFromAvg = avgPrice > 0 ? ((avgPrice - lowest_price) / avgPrice) * 100 : 0;

  const updateData = {
    current_price: lowest_price, currency,
    lowest_price_90d: lowestPrice90d, highest_price_90d: highestPrice90d,
    is_low_price: isLowPrice, last_checked: now,
    shops: JSON.stringify(shops), lowest_shop_name,
    is_multi_shop: shops.length > 1, primary_shop: lowest_shop_name,
  };
  if (image_url) updateData.image_url = image_url;

  await base44.asServiceRole.entities.Product.update(product.id, updateData);

  const hasTargetPrice = product.target_price && product.target_price > 0;
  const meetsTargetPrice = hasTargetPrice && lowest_price <= product.target_price;
  const meetsPctThreshold = !hasTargetPrice && percentFromAvg >= 5;
  const qualifies = (meetsTargetPrice || meetsPctThreshold) && product.notify_on_drop && product.created_by;

  return { price: lowest_price, isLowPrice, avgPrice, lowestPrice: lowestPrice90d, highestPrice: highestPrice90d, percentFromAvg, qualifies, hasTargetPrice, currency, imageUrl: image_url, lowest_shop_name, lowest_shop_url };
}

function buildProductRow(product, result) {
  const appUrl = `https://prisfall.se/product/${product.id}`;
  const buyUrl = result.lowest_shop_url || `https://prisjakt.nu`;
  const discount = result.avgPrice > 0 ? Math.round(((result.avgPrice - result.price) / result.avgPrice) * 100) : 0;
  const shopLabel = result.lowest_shop_name || "bästa butiken";
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
        <span style="font-size:0.85em;color:#555;margin-top:4px;display:block">🏪 Lägst på: <strong>${shopLabel}</strong></span>
        <span style="background:#dcfce7;color:#16a34a;padding:3px 8px;border-radius:4px;font-size:0.8em;display:inline-block;margin-top:6px">${badgeText}</span>
        <br/>
        <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
          <a href="${buyUrl}" style="background:#16a34a;color:white;padding:8px 16px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:13px">Köp på ${shopLabel} →</a>
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
        <p style="color:#6b7280;margin:4px 0 0">Din prisbevakning från svenska butiker</p>
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

    const base44 = createClientFromRequest(req);
    const products = await base44.asServiceRole.entities.Product.list();
    if (products.length === 0) return Response.json({ message: 'No products to update', updated: 0, total: 0 });

    let updated = 0;
    const errors = [];
    const errorCounts = {};
    const globalUpdatedPids = new Set();
    const userNotifyMap = {};
    let apifyBroken = false; // abort early if credits/auth fails on first product

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      if (product.created_by) {
        if (!userNotifyMap[product.created_by]) userNotifyMap[product.created_by] = { qualifiedProducts: [], totalWatched: 0 };
        userNotifyMap[product.created_by].totalWatched++;
      }

      if (apifyBroken) {
        errors.push({ id: product.prisjakt_id || product.asin, error: "Skipped — Apify integration broken" });
        continue;
      }

      try {
        const result = await fetchAndSavePrice(base44, product, globalUpdatedPids);
        updated++;
        if (result.qualifies && product.created_by) userNotifyMap[product.created_by].qualifiedProducts.push({ product, result });
      } catch (err) {
        const code = classifyApifyError(err);
        errorCounts[code] = (errorCounts[code] || 0) + 1;
        console.error(`Failed ${product.prisjakt_id || product.asin}: ${code} — ${err.message}`);
        errors.push({ id: product.prisjakt_id || product.asin, code, error: err.message.substring(0, 200) });
        if (code === "APIFY_OUT_OF_CREDITS" || code === "APIFY_AUTH_ERROR" || code === "APIFY_CONFIG_MISSING" || code === "APIFY_ACTOR_NOT_FOUND") {
          console.error(`ABORT: ${code} — skipping remaining ${products.length - i - 1} products`);
          apifyBroken = true;
        }
      }
      if (i < products.length - 1 && !apifyBroken) await new Promise(r => setTimeout(r, 2000));
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

    const msg = `Price update: ${updated}/${products.length} updated, ${emailsSent} emails. Errors: ${JSON.stringify(errorCounts)}`;
    console.log(msg);
    return Response.json({ message: msg, updated, total: products.length, emailsSent, errors, errorCounts, aborted: apifyBroken });
  } catch (error) {
    console.error("checkPrices fatal:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});