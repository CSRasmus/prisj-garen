import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const APIFY_API_KEY = Deno.env.get("APIFY_API_KEY");
const ACTOR_ID = Deno.env.get("APIFY-PRISJAKT-ACTOR-ID");

// ---------- Shared Apify helpers (duplicated across functions; no local imports allowed) ----------
async function runActor(input) {
  if (!APIFY_API_KEY) { const e = new Error("APIFY_API_KEY saknas i miljövariabler"); e.code = "CONFIG"; throw e; }
  if (!ACTOR_ID) { const e = new Error("APIFY-PRISJAKT-ACTOR-ID saknas i miljövariabler"); e.code = "CONFIG"; throw e; }

  const encodedActorId = ACTOR_ID.replace("/", "~");
  const url = `https://api.apify.com/v2/acts/${encodedActorId}/run-sync-get-dataset-items?token=${APIFY_API_KEY}&timeout=120`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const responseText = await res.text();
  console.log(`[Apify] status=${res.status} body=${responseText.substring(0, 400)}`);

  if (!res.ok) {
    let apifyError = null;
    try { apifyError = JSON.parse(responseText)?.error || null; } catch { /* noop */ }
    const err = new Error(`Apify ${res.status}: ${responseText.substring(0, 300)}`);
    err.status = res.status;
    err.apifyError = apifyError;
    err.rawBody = responseText;
    throw err;
  }
  return JSON.parse(responseText);
}

function mapApifyError(err) {
  if (err.code === "CONFIG") return { code: "APIFY_CONFIG_MISSING", userMessage: err.message, details: err.message, status: 500 };
  const status = err.status;
  const type = err.apifyError?.type;
  const msg = err.apifyError?.message || err.message;
  if (type === "not-enough-usage-to-run-paid-actor" || status === 402) {
    return { code: "APIFY_OUT_OF_CREDITS", userMessage: "Prisuppdatering pausad — Apify-kontot saknar kredit. Admin måste fylla på på console.apify.com/billing.", details: msg, status: 503 };
  }
  if (status === 401 || status === 403) return { code: "APIFY_AUTH_ERROR", userMessage: "Apify API-nyckeln är ogiltig eller saknar behörighet.", details: msg, status: 503 };
  if (status === 404) return { code: "APIFY_ACTOR_NOT_FOUND", userMessage: "Apify-actorn hittades inte. Kontrollera APIFY-PRISJAKT-ACTOR-ID.", details: msg, status: 503 };
  return { code: "APIFY_UNKNOWN_ERROR", userMessage: `Apify-fel (${status || "nätverk"}): ${msg}`, details: msg, status: 503 };
}
// ---------- End shared helpers ----------

async function fetchPrisjaktPrices(prisjakt_id) {
  const items = await runActor({ productId: prisjakt_id, mode: "PRODUCT_DETAIL" });
  if (!items.length) throw new Error(`Ingen prisdata för prisjakt_id: ${prisjakt_id}`);
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
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { product_id, asin, prisjakt_id: inputPrisjaktId } = await req.json();
    const pid = inputPrisjaktId || asin;
    if (!pid) return Response.json({ error: 'prisjakt_id or asin required' }, { status: 400 });

    console.log(`fetchProductPrice: pid=${pid} product_id=${product_id}`);

    let data;
    try {
      data = await fetchPrisjaktPrices(pid);
    } catch (err) {
      const mapped = mapApifyError(err);
      console.error(`fetchProductPrice Apify fail: code=${mapped.code} details=${mapped.details}`);
      return Response.json({ error: mapped.userMessage, code: mapped.code, details: mapped.details }, { status: mapped.status });
    }

    const { shops, lowest_price, lowest_shop_name, image_url } = data;
    if (!lowest_price || lowest_price < 1) throw new Error(`Ogiltigt pris: ${lowest_price}`);

    const now = new Date().toISOString();
    if (!product_id) return Response.json({ success: true, price: lowest_price, currency: "SEK", shops });

    await saveToGlobalHistory(base44, pid, lowest_price, lowest_shop_name, now);
    await base44.entities.PriceHistory.create({ product_id, price: lowest_price, currency: "SEK", checked_at: now });

    const globalHistory = await base44.asServiceRole.entities.GlobalPriceHistory.filter({ asin: pid }, "-checked_at", 500);
    const allPrices = [...globalHistory.map(h => h.price), lowest_price].filter(p => p > 0);
    const lowestPrice90d = Math.min(...allPrices);
    const highestPrice90d = Math.max(...allPrices);
    const isLowPrice = lowest_price <= lowestPrice90d * 1.05;

    const updateData = {
      current_price: lowest_price,
      currency: "SEK",
      lowest_price_90d: lowestPrice90d,
      highest_price_90d: highestPrice90d,
      is_low_price: isLowPrice,
      last_checked: now,
      shops: JSON.stringify(shops),
      lowest_shop_name,
      is_multi_shop: shops.length > 1,
      primary_shop: lowest_shop_name,
    };
    if (image_url) updateData.image_url = image_url;
    if (inputPrisjaktId) updateData.prisjakt_id = inputPrisjaktId;

    await base44.entities.Product.update(product_id, updateData);
    console.log(`fetchProductPrice ok: pid=${pid} price=${lowest_price} shops=${shops.length}`);

    return Response.json({ success: true, price: lowest_price, currency: "SEK", shops });
  } catch (error) {
    console.error("fetchProductPrice fatal:", error.message);
    return Response.json({ error: error.message || "Okänt fel" }, { status: 500 });
  }
});