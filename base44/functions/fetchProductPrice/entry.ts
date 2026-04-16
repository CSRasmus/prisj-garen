import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function fetchPriceWithLLM(base44, prompt) {
  const rawText = await base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: true,
    model: "gemini_3_1_pro"
  });

  if (!rawText) return null;

  const cleaned = String(rawText).replace(/```json\n?|\n?```/g, '').trim();
  const jsonMatch = cleaned.match(/\{[^{}]*\}/);
  if (!jsonMatch) return null;

  const result = JSON.parse(jsonMatch[0]);
  const price = parseFloat(result.price);
  if (!price || price < 1 || price > 100000) return null;

  return price;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { product_id, asin, title } = await req.json();
    if (!asin) return Response.json({ error: 'ASIN required' }, { status: 400 });

    console.log(`Fetching price for ASIN: ${asin}, title: ${title}`);

    // Primary: fetch directly from amazon.se product page
    let price = await fetchPriceWithLLM(base44,
      `Go to this exact URL on Amazon Sweden and find the current price: https://www.amazon.se/dp/${asin}
Return ONLY a JSON object: { "price": number, "currency": "SEK" }
The price must be the exact price shown on that specific Amazon.se product page right now.
Do not use Prisjakt or any other site. Only amazon.se.`
    );
    console.log(`Primary result for ${asin}: ${price}`);

    // Fallback: search-based approach
    if (!price) {
      console.log(`Primary failed, trying fallback for ${asin}`);
      price = await fetchPriceWithLLM(base44,
        `Search for "amazon.se ${asin} pris" and find the exact current price on amazon.se for ASIN ${asin}.
Return ONLY: { "price": number, "currency": "SEK" }`
      );
      console.log(`Fallback result for ${asin}: ${price}`);
    }

    if (!price) {
      throw new Error(`Kunde inte hämta pris för ASIN ${asin}`);
    }

    const currency = "SEK";
    const now = new Date().toISOString();
    console.log(`Final price: ${price} ${currency} for ASIN ${asin}`);

    if (product_id) {
      const [_, history] = await Promise.all([
        base44.entities.PriceHistory.create({ product_id, price, currency, checked_at: now }),
        base44.entities.PriceHistory.filter({ product_id }, "-checked_at", 90)
      ]);

      const prices = [...history.map(h => h.price).filter(p => p > 0), price];
      const lowestPrice = Math.min(...prices);
      const highestPrice = Math.max(...prices);
      const isLowPrice = price <= lowestPrice * 1.05;

      await base44.entities.Product.update(product_id, {
        current_price: price,
        currency,
        lowest_price_90d: lowestPrice,
        highest_price_90d: highestPrice,
        is_low_price: isLowPrice,
        last_checked: now
      });

      console.log(`Saved to DB. isLow=${isLowPrice} low90=${lowestPrice} high90=${highestPrice}`);
    }

    return Response.json({ success: true, price, currency });
  } catch (error) {
    console.error("fetchProductPrice error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});