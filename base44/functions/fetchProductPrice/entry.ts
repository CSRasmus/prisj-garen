import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { product_id, asin, title } = await req.json();
    if (!asin) return Response.json({ error: 'ASIN required' }, { status: 400 });

    console.log(`Fetching price for ASIN: ${asin}, title: ${title}`);

    // Search Swedish price comparison sites (prisjakt, pricespy) which index Amazon.se prices
    // These are not Cloudflare-protected and are accessible to LLM web search
    const rawText = await base44.integrations.Core.InvokeLLM({
      prompt: `Search for the current price of this product on Swedish price comparison sites.
Product: "${title}"
Amazon ASIN: ${asin}

Search on prisjakt.nu or prispy.se or google.se for: "${title} prisjakt" or "${title} pricespy"
Find the current Amazon.se price for this exact product.

Respond with ONLY this JSON (no markdown, no extra text):
{"price": 1299.00, "currency": "SEK", "source": "prisjakt"}

If you cannot find the price, respond:
{"price": 0, "currency": "SEK", "source": "not_found"}`,
      add_context_from_internet: true,
      model: "gemini_3_1_pro"
    });

    console.log("LLM raw response:", rawText);

    if (!rawText) {
      throw new Error("LLM returned empty response");
    }

    // Extract JSON - handle markdown code blocks too
    const cleaned = String(rawText).replace(/```json\n?|\n?```/g, '').trim();
    const jsonMatch = cleaned.match(/\{[^{}]*\}/);
    if (!jsonMatch) {
      console.error("No JSON in response:", rawText);
      throw new Error("Could not parse price from response");
    }

    const result = JSON.parse(jsonMatch[0]);
    console.log("Parsed:", JSON.stringify(result));

    const price = parseFloat(result.price);
    if (!price || price <= 0) {
      throw new Error(`Priset hittades inte för ASIN ${asin}`);
    }

    const currency = result.currency || "SEK";
    const now = new Date().toISOString();

    if (product_id) {
      console.log(`Saving price ${price} ${currency} for product ${product_id}`);

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

      console.log(`Done. price=${price} ${currency} isLow=${isLowPrice}`);
    }

    return Response.json({ success: true, price, currency });
  } catch (error) {
    console.error("fetchProductPrice error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});