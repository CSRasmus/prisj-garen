import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const EASYPARSER_API_KEY = Deno.env.get("EASYPARSER_API_KEY");

// Admin-only: re-fetch SALES_ANALYSIS_HISTORY for every distinct ASIN, read
// result.product.pricing.offers.new_offer_min_price / new_offer_max_price,
// and update each tracked Product's lowest_price_90d / highest_price_90d.
// This corrects products whose 90d range was previously computed from the
// multi-seller weekly average_price (which is not buybox).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const products = await base44.asServiceRole.entities.Product.list("-created_date", 1000);
    const distinctAsins = [...new Set(products.map(p => p.asin).filter(Boolean))];

    const logs = [];
    let processed = 0;
    let updated = 0;
    let failed = 0;

    for (const asin of distinctAsins) {
      try {
        const params = new URLSearchParams({
          api_key: EASYPARSER_API_KEY,
          platform: "AMZ",
          operation: "SALES_ANALYSIS_HISTORY",
          domain: ".se",
          asin,
          output: "json",
          history_range: "0", // we only need pricing.offers, not the weekly history
        });

        const res = await fetch(`https://realtime.easyparser.com/v1/request?${params}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const offers = data.result?.product?.pricing?.offers || {};
        const newOfferMin = Number(offers.new_offer_min_price);
        const newOfferMax = Number(offers.new_offer_max_price);

        if (!(newOfferMin > 0) || !(newOfferMax > 0)) {
          logs.push(`[SKIP] ${asin} — no new_offer_min/max_price in response`);
          processed++;
          await new Promise(r => setTimeout(r, 1500));
          continue;
        }

        const productsForAsin = products.filter(p => p.asin === asin);
        for (const p of productsForAsin) {
          const oldLow = p.lowest_price_90d;
          const oldHigh = p.highest_price_90d;
          await base44.asServiceRole.entities.Product.update(p.id, {
            lowest_price_90d: newOfferMin,
            highest_price_90d: newOfferMax,
          });
          updated++;
          logs.push(`[OK] ${asin} — low: ${oldLow} → ${newOfferMin}, high: ${oldHigh} → ${newOfferMax}`);
        }

        processed++;
        await new Promise(r => setTimeout(r, 1500)); // rate limit
      } catch (err) {
        failed++;
        logs.push(`[FAIL] ${asin} — ${err.message}`);
      }
    }

    const message = `Processed ${processed}/${distinctAsins.length} ASINs, updated ${updated} products, ${failed} failed`;
    console.log(message);
    return Response.json({
      success: true,
      totalProducts: products.length,
      distinctAsins: distinctAsins.length,
      processed,
      updated,
      failed,
      logs,
      message,
    });
  } catch (error) {
    console.error("refreshPricingOffers error:", error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});