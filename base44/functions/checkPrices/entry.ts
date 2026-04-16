import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all products
    const products = await base44.asServiceRole.entities.Product.list();
    
    if (products.length === 0) {
      return Response.json({ message: 'No products to check', checked: 0 });
    }

    const results = [];

    for (const product of products) {
      // Use LLM with internet to look up current price
      const priceData = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `What is the current price in SEK for the Amazon.se product with ASIN ${product.asin}? Product title: "${product.title}". Return the price as a number. If you can't find the exact price, return null.`,
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

      if (priceData.found && priceData.price) {
        const now = new Date().toISOString();
        
        // Record price history
        await base44.asServiceRole.entities.PriceHistory.create({
          product_id: product.id,
          price: priceData.price,
          currency: priceData.currency || "SEK",
          checked_at: now
        });

        // Get last 90 days of price history for this product
        const history = await base44.asServiceRole.entities.PriceHistory.filter(
          { product_id: product.id },
          "-checked_at",
          90
        );

        const prices = history.map(h => h.price).filter(p => p != null);
        const lowestPrice = prices.length > 0 ? Math.min(...prices) : priceData.price;
        const highestPrice = prices.length > 0 ? Math.max(...prices) : priceData.price;

        // Determine if this is a low price (within 15% of the lowest)
        const range = highestPrice - lowestPrice;
        const isLowPrice = range > 0 
          ? ((priceData.price - lowestPrice) / range) <= 0.15 
          : false;

        // Update product
        await base44.asServiceRole.entities.Product.update(product.id, {
          current_price: priceData.price,
          currency: priceData.currency || "SEK",
          lowest_price_90d: lowestPrice,
          highest_price_90d: highestPrice,
          is_low_price: isLowPrice,
          last_checked: now
        });

        // Send email notification if price is low and notifications are enabled
        if (isLowPrice && product.notify_on_drop && product.created_by) {
          const affiliateUrl = `https://www.amazon.se/dp/${product.asin}?tag=prisbevak-21`;
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: product.created_by,
            subject: `🟢 Lågt pris på ${product.title}`,
            body: `
              <h2>Prisvarning: ${product.title}</h2>
              <p>Priset har sjunkit till <strong>${priceData.price} ${priceData.currency || "SEK"}</strong>!</p>
              <p>Lägsta priset senaste 90 dagarna: ${lowestPrice} ${priceData.currency || "SEK"}</p>
              <p>Högsta priset senaste 90 dagarna: ${highestPrice} ${priceData.currency || "SEK"}</p>
              <p><a href="${affiliateUrl}">Köp nu på Amazon →</a></p>
              <br/>
              <p style="color: #888; font-size: 12px;">PrisKoll - Din prisbevakning för Amazon</p>
            `
          });

          results.push({ asin: product.asin, price: priceData.price, notified: true });
        } else {
          results.push({ asin: product.asin, price: priceData.price, notified: false });
        }
      } else {
        results.push({ asin: product.asin, error: "Could not find price" });
      }
    }

    return Response.json({ 
      message: 'Price check completed', 
      checked: results.length,
      results 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});