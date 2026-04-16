import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const RAINFOREST_API_KEY = Deno.env.get("RAINFOREST_API_KEY");

async function fetchAmazonPrice(asin) {
  const url = `https://api.rainforestapi.com/request?api_key=${RAINFOREST_API_KEY}&type=product&asin=${asin}&amazon_domain=amazon.se`;
  const response = await fetch(url);
  const data = await response.json();
  
  console.log("Rainforest raw response:", JSON.stringify(data).substring(0, 500));

  if (!response.ok) throw new Error(`Rainforest API error: ${response.status} - ${JSON.stringify(data)}`);

  const product = data.product;
  if (!product) throw new Error(`No product in response. Message: ${data.message || ''} Keys: ${Object.keys(data).join(', ')}`);

  const price =
    product.buybox_winner?.price?.value ||
    product.price?.value ||
    product.rrp?.value ||
    null;

  if (!price || price < 1 || price > 100000) {
    throw new Error(`Invalid price: ${price}. product keys: ${Object.keys(product).join(', ')}`);
  }

  return {
    price: parseFloat(price),
    currency: "SEK",
    image_url: product.main_image?.link || null,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { product_id, asin, title } = await req.json();
    if (!asin) return Response.json({ error: 'ASIN required' }, { status: 400 });

    console.log(`Fetching price via Rainforest API for ASIN: ${asin}`);
    const result = await fetchAmazonPrice(asin);
    console.log(`Got price: ${result.price} SEK for ${asin}`);

    const now = new Date().toISOString();

    if (product_id) {
      const [_, history] = await Promise.all([
        base44.entities.PriceHistory.create({ product_id, price: result.price, currency: result.currency, checked_at: now }),
        base44.entities.PriceHistory.filter({ product_id }, "-checked_at", 90)
      ]);

      const prices = [...history.map(h => h.price).filter(p => p > 0), result.price];
      const lowestPrice = Math.min(...prices);
      const highestPrice = Math.max(...prices);
      const isLowPrice = result.price <= lowestPrice * 1.05;

      const updateData = {
        current_price: result.price,
        currency: result.currency,
        lowest_price_90d: lowestPrice,
        highest_price_90d: highestPrice,
        is_low_price: isLowPrice,
        last_checked: now
      };
      if (result.image_url) updateData.image_url = result.image_url;

      await base44.entities.Product.update(product_id, updateData);
      console.log(`Saved to DB. isLow=${isLowPrice} low90=${lowestPrice} high90=${highestPrice}`);
    }

    return Response.json({ success: true, price: result.price, currency: result.currency });
  } catch (error) {
    console.error("fetchProductPrice error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});