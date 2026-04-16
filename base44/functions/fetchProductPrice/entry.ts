import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { product_id, asin, title } = await req.json();
    if (!asin) return Response.json({ error: 'ASIN required' }, { status: 400 });

    console.log(`Fetching price for ASIN: ${asin}`);

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Search amazon.se for the product with ASIN ${asin}. Find the exact current price listed on the product page right now. Return ONLY a JSON object with exactly these fields: { price: number, currency: string }. Example: { price: 299.00, currency: "SEK" }. Do not include any other text.`,
      add_context_from_internet: true,
      model: "gemini_3_flash",
      response_json_schema: {
        type: "object",
        properties: {
          price: { type: "number" },
          currency: { type: "string" }
        },
        required: ["price", "currency"]
      }
    });

    console.log("LLM result:", JSON.stringify(result));

    if (!result || typeof result.price !== "number" || result.price <= 0) {
      console.error("Invalid price result:", result);
      return Response.json({ error: "Could not find a valid price for this product" }, { status: 422 });
    }

    const price = result.price;
    const currency = result.currency || "SEK";
    const now = new Date().toISOString();

    if (product_id) {
      await base44.entities.PriceHistory.create({
        product_id,
        price,
        currency,
        checked_at: now
      });

      const history = await base44.entities.PriceHistory.filter({ product_id }, "-checked_at", 90);
      const prices = history.map(h => h.price).filter(p => typeof p === "number" && p > 0);
      const lowestPrice = prices.length > 0 ? Math.min(...prices) : price;
      const highestPrice = prices.length > 0 ? Math.max(...prices) : price;
      const isLowPrice = price <= lowestPrice * 1.05;

      await base44.entities.Product.update(product_id, {
        current_price: price,
        currency,
        lowest_price_90d: lowestPrice,
        highest_price_90d: highestPrice,
        is_low_price: isLowPrice,
        last_checked: now
      });

      console.log(`Updated product ${product_id}: price=${price}, lowest=${lowestPrice}, highest=${highestPrice}, isLow=${isLowPrice}`);
    }

    return Response.json({ success: true, price, currency });
  } catch (error) {
    console.error("fetchProductPrice error:", error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});