import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { product_id, asin, title } = await req.json();
    if (!asin) return Response.json({ error: 'ASIN required' }, { status: 400 });

    console.log(`Fetching price for ASIN: ${asin}, product_id: ${product_id}`);

    let priceData;
    try {
      priceData = await base44.integrations.Core.InvokeLLM({
        prompt: `What is the current price in SEK for Amazon product with ASIN ${asin} on amazon.se? Product title: "${title}". Return only a JSON object with: { "price": number, "currency": "SEK", "found": true }. If you cannot find the price, return { "found": false, "price": 0, "currency": "SEK" }.`,
        add_context_from_internet: true,
        model: "gemini_3_flash",
        response_json_schema: {
          type: "object",
          properties: {
            price: { type: "number" },
            currency: { type: "string" },
            found: { type: "boolean" }
          },
          required: ["price", "currency", "found"]
        }
      });
    } catch (llmError) {
      console.error("LLM error:", llmError.message);
      return Response.json({ found: false, error: llmError.message });
    }

    console.log("LLM response:", JSON.stringify(priceData));

    if (!priceData || priceData.found === false || !priceData.price || priceData.price <= 0) {
      console.log("Price not found or invalid");
      return Response.json({ found: false, error: 'Could not find price for this product' });
    }

    const now = new Date().toISOString();
    const price = priceData.price;
    const currency = priceData.currency || "SEK";

    if (product_id) {
      await base44.entities.PriceHistory.create({
        product_id,
        price,
        currency,
        checked_at: now
      });

      const history = await base44.entities.PriceHistory.filter({ product_id }, "-checked_at", 90);
      const prices = history.map(h => h.price).filter(p => p != null && p > 0);
      const lowestPrice = prices.length > 0 ? Math.min(...prices) : price;
      const highestPrice = prices.length > 0 ? Math.max(...prices) : price;
      const range = highestPrice - lowestPrice;
      const isLowPrice = range > 0 ? ((price - lowestPrice) / range) <= 0.15 : false;

      await base44.entities.Product.update(product_id, {
        current_price: price,
        currency,
        lowest_price_90d: lowestPrice,
        highest_price_90d: highestPrice,
        is_low_price: isLowPrice,
        last_checked: now
      });

      console.log(`Updated product ${product_id} with price ${price} ${currency}`);
    }

    return Response.json({ success: true, price, currency, found: true });
  } catch (error) {
    console.error("Unexpected error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});