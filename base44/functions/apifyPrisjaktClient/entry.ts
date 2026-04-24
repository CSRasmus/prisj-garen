// Apify Prisjakt Scraper client
// NOTE: EASYPARSER_API_KEY can be removed from Base44 environment variables.

const APIFY_API_KEY = Deno.env.get("APIFY_API_KEY");
const ACTOR_ID = Deno.env.get("APIFY_PRISJAKT_ACTOR_ID");

async function runActor(input, timeoutSecs = 120) {
  const url = `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_API_KEY}&timeout=${timeoutSecs}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apify actor error ${res.status}: ${text.substring(0, 300)}`);
  }
  return res.json();
}

/**
 * Search for products on Prisjakt by query string.
 * Returns: [{ prisjakt_id, title, image_url, category, lowest_price, shop_count, prisjakt_url }]
 */
export async function searchProducts(query, limit = 20) {
  const items = await runActor({ searchQuery: query, maxItems: limit, mode: "SEARCH" });
  return items.map(item => ({
    prisjakt_id: item.id || item.prisjakt_id || item.productId,
    title: item.title || item.name,
    image_url: item.image || item.imageUrl || item.image_url,
    category: item.category,
    lowest_price: item.lowestPrice ?? item.lowest_price ?? item.price,
    shop_count: item.shopCount ?? item.shop_count ?? item.numberOfShops ?? 1,
    prisjakt_url: item.url || item.prisjaktUrl,
  })).filter(p => p.prisjakt_id && p.title);
}

/**
 * Get full price data for a specific Prisjakt product ID.
 * Returns: { title, image_url, prisjakt_url, shops: [{shop_name, shop_url, price, product_url, in_stock}], lowest_price, highest_price, price_history }
 */
export async function getProductPrices(prisjakt_id) {
  const items = await runActor({ productId: prisjakt_id, mode: "PRODUCT_DETAIL" });
  if (!items.length) throw new Error(`Ingen prisdata hittades för produkt-ID: ${prisjakt_id}`);
  const item = items[0];

  const shops = (item.offers || item.shops || item.prices || []).map(o => ({
    shop_name: o.shopName || o.shop_name || o.seller || o.name,
    shop_url: o.shopUrl || o.shop_url || o.sellerUrl,
    price: typeof o.price === "number" ? o.price : parseFloat(String(o.price || "0").replace(/[^\d.]/g, "")),
    product_url: o.productUrl || o.product_url || o.url || o.buyUrl,
    in_stock: o.inStock ?? o.in_stock ?? true,
  })).filter(s => s.shop_name && s.price > 0);

  const prices = shops.map(s => s.price).filter(p => p > 0);
  const lowest_price = prices.length ? Math.min(...prices) : null;
  const highest_price = prices.length ? Math.max(...prices) : null;

  return {
    title: item.title || item.name,
    image_url: item.image || item.imageUrl || item.image_url,
    prisjakt_url: item.url || item.prisjaktUrl,
    shops,
    lowest_price,
    highest_price,
    price_history: item.priceHistory || item.price_history || [],
  };
}

/**
 * Find a product on Prisjakt by URL (Amazon, Komplett, NetOnNet, Webhallen, etc.)
 * Returns same format as getProductPrices.
 */
export async function getProductByUrl(productUrl) {
  const items = await runActor({ url: productUrl, mode: "URL_LOOKUP" });
  if (!items.length) throw new Error(`Produkten hittades inte på Prisjakt för URL: ${productUrl}`);
  const item = items[0];

  // If actor returns a prisjakt_id, fetch full price data
  const pid = item.id || item.prisjakt_id || item.productId;
  if (pid) return getProductPrices(pid);

  // Otherwise parse directly
  const shops = (item.offers || item.shops || item.prices || []).map(o => ({
    shop_name: o.shopName || o.shop_name || o.seller || o.name,
    shop_url: o.shopUrl || o.shop_url || o.sellerUrl,
    price: typeof o.price === "number" ? o.price : parseFloat(String(o.price || "0").replace(/[^\d.]/g, "")),
    product_url: o.productUrl || o.product_url || o.url || o.buyUrl,
    in_stock: o.inStock ?? o.in_stock ?? true,
  })).filter(s => s.shop_name && s.price > 0);

  const prices = shops.map(s => s.price).filter(p => p > 0);
  return {
    title: item.title || item.name,
    image_url: item.image || item.imageUrl || item.image_url,
    prisjakt_url: item.url || item.prisjaktUrl,
    shops,
    lowest_price: prices.length ? Math.min(...prices) : null,
    highest_price: prices.length ? Math.max(...prices) : null,
    price_history: item.priceHistory || item.price_history || [],
  };
}

// For use as a standalone backend function (not an HTTP handler — import only)
// This file exports functions to be called by other Deno functions.