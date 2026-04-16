import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { product_id, asin, title } = await req.json();
    if (!asin) return Response.json({ error: 'ASIN required' }, { status: 400 });

    console.log(`Fetching price for ASIN: ${asin}`);

    // Use text response (no response_json_schema) since gemini_3_flash + internet can return null with schema
    const rawText = await base44.integrations.Core.InvokeLLM({
      prompt: `Go to amazon.se and search for the product with ASIN ${asin} (title: "${title}"). Find the current price shown on the product page. Respond with ONLY a JSON object like this: {"price": 299.00, "currency": "SEK"}. No other text, just the JSON.`,
      add_context_from_internet: true,
      model: "gemini_3_flash"
    });

    console.log("LLM raw response:", rawText);

    if (!rawText) {
      throw new Error("LLM returned empty response");
    }

    // Parse JSON from the text response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in response:", rawText);
      throw new Error("Could not parse price from LLM response");
    }

    const result = JSON.parse(jsonMatch[0]);
    console.log("Parsed result:", JSON.stringify(result));

    const price = parseFloat(result.price);
    if (!price || price <= 0) {
      throw new Error(`Invalid price value: ${result.price}`);
    }

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

      console.log(`Updated product ${product_id}: price=${price} ${currency}, isLow=${isLowPrice}`);
    }

    return Response.json({ success: true, price, currency });
  } catch (error) {
    console.error("fetchProductPrice error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});