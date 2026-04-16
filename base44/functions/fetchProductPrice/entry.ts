import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { product_id, asin, title } = await req.json();
    if (!asin) return Response.json({ error: 'ASIN required' }, { status: 400 });

    const priceData = await base44.integrations.Core.InvokeLLM({
      prompt: `What is the current price in SEK for the Amazon.se product with ASIN ${asin}? Product title: "${title}". Return the numeric price in SEK, the currency code, and whether you found it. If you cannot find the exact price, return found: false.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          price: { type: "number" },
          currency: { type: "string" },
          found: { type: "boolean" }
        }
      }
    });

    if (!priceData.found || !priceData.price) {
      return Response.json({ error: 'Could not find price for this product' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const price = priceData.price;
    const currency = priceData.currency || "SEK";

    // Save price history entry
    if (product_id) {
      await base44.entities.PriceHistory.create({
        product_id,
        price,
        currency,
        checked_at: now
      });

      // Fetch 90-day history for stats
      const history = await base44.entities.PriceHistory.filter({ product_id }, "-checked_at", 90);
      const prices = history.map(h => h.price).filter(p => p != null);
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
    }

    return Response.json({ price, currency, found: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});