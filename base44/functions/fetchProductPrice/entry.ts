import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const EASYPARSER_API_KEY = Deno.env.get("EASYPARSER_API_KEY");

// Parse Amazon price strings like "2,171.49" or "2 171,49 kr" into a float.
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
    console.warn(`Easyparser ${res.status} for ${asin}, retrying...`);
    await new Promise(r => setTimeout(r, 3000));
    res = await doFetch();
    if (!res.ok) throw new Error(`Easyparser svarade med ${res.status}`);
  }
  const data = await res.json();
  if (!data.request_info?.success || data.request_info?.status_code === 404) {
    throw new Error("Kunde inte hitta produkten på Amazon.se");
  }
  const product = data.result?.detail;
  if (!product) throw new Error("Ingen produktdata från Easyparser");

  const priceRaw = product.buybox_winner?.price?.value ?? product.price?.value ?? null;
  const price = parsePrice(priceRaw);
  if (!price || price < 1) throw new Error(`Ogiltigt pris från Easyparser: ${priceRaw}`);

  return {
    title: product.title,
    image_url: product.main_image?.link || product.images?.[0]?.link || null,
    price,
  };
}

async function saveToGlobalHistory(base44, asin, price, now) {
  const today = now.substring(0, 10);
  const existing = await base44.asServiceRole.entities.GlobalPriceHistory.filter({ asin }, "-checked_at", 5);
  const alreadySavedToday = existing.some(h => h.checked_at?.substring(0, 10) === today);
  if (!alreadySavedToday) {
    await base44.asServiceRole.entities.GlobalPriceHistory.create({
      asin, price, currency: "SEK", checked_at: now, amazon_domain: "amazon.se", shop_name: "Amazon.se",
    });
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (!EASYPARSER_API_KEY) return Response.json({ error: "EASYPARSER_API_KEY saknas" }, { status: 500 });

    const { product_id, asin } = await req.json();
    if (!asin) return Response.json({ error: 'ASIN krävs' }, { status: 400 });

    console.log(`fetchProductPrice: asin=${asin} product_id=${product_id}`);

    const { price, image_url } = await fetchFromEasyparser(asin);
    const now = new Date().toISOString();

    if (!product_id) return Response.json({ success: true, price, currency: "SEK" });

    await saveToGlobalHistory(base44, asin, price, now);
    await base44.entities.PriceHistory.create({ product_id, price, currency: "SEK", checked_at: now });

    const globalHistory = await base44.asServiceRole.entities.GlobalPriceHistory.filter({ asin, amazon_domain: "amazon.se" }, "-checked_at", 500);
    const allPrices = [...globalHistory.map(h => h.price), price].filter(p => p > 0);
    const lowestPrice90d = Math.min(...allPrices);
    const highestPrice90d = Math.max(...allPrices);
    const isLowPrice = price <= lowestPrice90d * 1.05;

    const updateData = {
      current_price: price, currency: "SEK",
      lowest_price_90d: lowestPrice90d, highest_price_90d: highestPrice90d,
      is_low_price: isLowPrice, last_checked: now,
    };
    if (image_url) updateData.image_url = image_url;

    await base44.entities.Product.update(product_id, updateData);
    console.log(`fetchProductPrice ok: asin=${asin} price=${price}`);

    return Response.json({ success: true, price, currency: "SEK" });
  } catch (error) {
    console.error("fetchProductPrice error:", error.message);
    return Response.json({ error: error.message || "Okänt fel" }, { status: 500 });
  }
});