// Search products on Prisjakt via Apify
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function runActor(input) {
  const apiKey = Deno.env.get("APIFY_API_KEY");
  const actorId = Deno.env.get("APIFY-PRISJAKT-ACTOR-ID");

  console.log("=== runActor called ===");
  console.log("API key exists:", !!apiKey);
  console.log("API key starts with:", apiKey?.substring(0, 10));
  console.log("Actor ID:", actorId);
  console.log("Input:", JSON.stringify(input));

  if (!apiKey) throw new Error("APIFY_API_KEY saknas i miljövariabler");
  if (!actorId) throw new Error("APIFY_PRISJAKT_ACTOR_ID saknas i miljövariabler");

  // Apify actor IDs with "/" must use "~" separator in URLs
  const encodedActorId = actorId.replace("/", "~");
  const url = `https://api.apify.com/v2/acts/${encodedActorId}/run-sync-get-dataset-items?token=${apiKey}&timeout=120`;
  console.log("Calling URL:", url.replace(apiKey, "REDACTED"));
  console.log("Request body:", JSON.stringify(input));

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  console.log("Response status:", res.status);
  const responseText = await res.text();
  console.log("Response body (first 500 chars):", responseText.substring(0, 500));

  if (!res.ok) {
    throw new Error(`Apify returned ${res.status}: ${responseText.substring(0, 300)}`);
  }

  return JSON.parse(responseText);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    console.log("=== searchPrisjakt called ===");
    console.log("Operation mode:", body.mode);
    console.log("Input params:", JSON.stringify(body));

    const { query, limit = 20, url: productUrl, prisjakt_id, mode = "SEARCH" } = body;

    let items = [];

    if (mode === "SEARCH" && query) {
      items = await runActor({ searchQuery: query, maxItems: limit, mode: "SEARCH" });
      console.log("Raw items count:", items.length);
      if (items.length > 0) console.log("First item keys:", Object.keys(items[0]));
      if (items.length > 0) console.log("First item:", JSON.stringify(items[0]).substring(0, 400));

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
      items = await runActor({ productId: prisjakt_id, mode: "PRODUCT_DETAIL" });
      console.log("Raw items count:", items.length);
      if (items.length > 0) console.log("First item:", JSON.stringify(items[0]).substring(0, 400));

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
      items = await runActor({ url: productUrl, mode: "URL_LOOKUP" });
      console.log("Raw items count:", items.length);
      if (items.length > 0) console.log("First item:", JSON.stringify(items[0]).substring(0, 400));

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