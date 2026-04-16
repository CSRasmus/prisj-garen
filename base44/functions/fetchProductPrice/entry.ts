import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { product_id, asin, title } = await req.json();
    if (!title) return Response.json({ error: 'title required' }, { status: 400 });

    console.log(`Fetching price for: ${title} (${asin})`);

    // Use gemini_3_1_pro with internet search - most reliable model for this task
    const rawText = await base44.integrations.Core.InvokeLLM({
      prompt: `Search for the current price of "${title}" on prisjakt.nu (Swedish price comparison site).
Find the lowest available price in SEK from Swedish shops.
Return ONLY valid JSON, no markdown code blocks, no extra text:
{"price": 1299.00, "currency": "SEK"}
If not found: {"price": 0, "currency": "SEK"}`,
      add_context_from_internet: true,
      model: "gemini_3_1_pro"
    });

    console.log("LLM response:", rawText);

    if (!rawText) throw new Error("Ingen respons från sökmotor");

    const cleaned = String(rawText).replace(/```json\n?|\n?```/g, '').trim();
    const jsonMatch = cleaned.match(/\{[^{}]*\}/);
    if (!jsonMatch) throw new Error("Kunde inte tolka svar: " + rawText);

    const result = JSON.parse(jsonMatch[0]);
    const price = parseFloat(result.price);

    if (!price || price <= 0) {
      throw new Error(`Priset hittades inte för "${title}"`);
    }

    const currency = result.currency || "SEK";
    const now = new Date().toISOString();
    console.log(`Got price: ${price} ${currency}`);

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

      console.log(`Saved. isLow=${isLowPrice}`);
    }

    return Response.json({ success: true, price, currency });
  } catch (error) {
    console.error("Error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});