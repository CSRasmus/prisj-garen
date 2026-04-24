// Search products on Prisjakt via Apify
// NOTE: EASYPARSER_API_KEY can be removed from Base44 environment variables.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const APIFY_API_KEY = Deno.env.get("APIFY_API_KEY");
const ACTOR_ID = Deno.env.get("APIFY_PRISJAKT_ACTOR_ID");

async function runActor(input) {
  const url = `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_API_KEY}&timeout=120`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apify error ${res.status}: ${text.substring(0, 300)}`);
  }
  return res.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { query, limit = 20, url: productUrl, prisjakt_id, mode = "SEARCH" } = await req.json();

    let items = [];

    if (mode === "SEARCH" && query) {
      // Search by query string
      items = await runActor({ searchQuery: query, maxItems: limit, mode: "SEARCH" });
      const products = items.map(item => ({
        prisjakt_id: item.id || item.prisjakt_id || item.productId,
        title: item.title || item.name,
        image_url: item.image || item.imageUrl || item.image_url,
        category: item.category,
        lowest_price: item.lowestPrice ?? item.lowest_price ?? item.price,
        shop_count: item.shopCount ?? item.shop_count ?? item.numberOfShops ?? 1,
        prisjakt_url: item.url || item.prisjaktUrl,
      })).filter(p => p.prisjakt_id && p.title);
      return Response.json({ products });

    } else if (mode === "PRODUCT_DETAIL" && prisjakt_id) {
      // Get full shop price list for a specific product
      items = await runActor({ productId: prisjakt_id, mode: "PRODUCT_DETAIL" });
      if (!items.length) throw new Error(`Ingen data för produkt: ${prisjakt_id}`);
      const item = items[0];
      const shops = (item.offers || item.shops || item.prices || []).map(o => ({
        shop_name: o.shopName || o.shop_name || o.seller || o.name,
        shop_url: o.shopUrl || o.shop_url,
        price: typeof o.price === "number" ? o.price : parseFloat(String(o.price || "0").replace(/[^\d.]/g, "")),
        product_url: o.productUrl || o.product_url || o.url || o.buyUrl,
        in_stock: o.inStock ?? o.in_stock ?? true,
      })).filter(s => s.shop_name && s.price > 0);
      const prices = shops.map(s => s.price);
      return Response.json({
        title: item.title || item.name,
        image_url: item.image || item.imageUrl || item.image_url,
        prisjakt_url: item.url || item.prisjaktUrl,
        shops,
        lowest_price: prices.length ? Math.min(...prices) : null,
        highest_price: prices.length ? Math.max(...prices) : null,
      });

    } else if (mode === "URL_LOOKUP" && productUrl) {
      // Look up by external product URL
      items = await runActor({ url: productUrl, mode: "URL_LOOKUP" });
      if (!items.length) throw new Error(`Produkten hittades inte på Prisjakt`);
      const item = items[0];
      const shops = (item.offers || item.shops || item.prices || []).map(o => ({
        shop_name: o.shopName || o.shop_name || o.seller || o.name,
        shop_url: o.shopUrl || o.shop_url,
        price: typeof o.price === "number" ? o.price : parseFloat(String(o.price || "0").replace(/[^\d.]/g, "")),
        product_url: o.productUrl || o.product_url || o.url || o.buyUrl,
        in_stock: o.inStock ?? o.in_stock ?? true,
      })).filter(s => s.shop_name && s.price > 0);
      const prices = shops.map(s => s.price);
      return Response.json({
        prisjakt_id: item.id || item.prisjakt_id || item.productId,
        title: item.title || item.name,
        image_url: item.image || item.imageUrl || item.image_url,
        prisjakt_url: item.url || item.prisjaktUrl,
        shops,
        lowest_price: prices.length ? Math.min(...prices) : null,
        highest_price: prices.length ? Math.max(...prices) : null,
      });

    } else {
      return Response.json({ error: 'Invalid mode or missing params' }, { status: 400 });
    }
  } catch (error) {
    console.error("searchPrisjakt error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});