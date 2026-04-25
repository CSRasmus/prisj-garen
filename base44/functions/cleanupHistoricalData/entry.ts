import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Admin-only: removes ALL multi-seller marketplace weekly average data from
// GlobalPriceHistory (where source = "easyparser_historical") AND resets
// lowest_price_90d / highest_price_90d on all Products so they get recomputed
// from live buy box data only on the next checkPrices run.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const logs = [];
    const log = (m) => { console.log(m); logs.push(m); };

    // 1. Delete GlobalPriceHistory rows where source = "easyparser_historical"
    let deletedHistory = 0;
    let historyFailed = 0;
    let page = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.GlobalPriceHistory.filter(
        { source: "easyparser_historical" }, "-checked_at", 200
      );
      if (batch.length === 0) break;
      log(`Deleting batch ${++page} (${batch.length} historical rows)...`);
      for (const row of batch) {
        try {
          await base44.asServiceRole.entities.GlobalPriceHistory.delete(row.id);
          deletedHistory++;
        } catch (err) {
          historyFailed++;
          log(`  delete ${row.id} failed: ${err.message}`);
        }
      }
      if (page > 50) { log("Safety stop after 50 pages"); break; }
    }
    log(`Deleted ${deletedHistory} historical rows (${historyFailed} failed)`);

    // 2. Reset lowest_price_90d / highest_price_90d on all Products
    const products = await base44.asServiceRole.entities.Product.list("-created_date", 5000);
    let productsReset = 0;
    let productsFailed = 0;
    for (const p of products) {
      if (p.lowest_price_90d == null && p.highest_price_90d == null) continue;
      try {
        await base44.asServiceRole.entities.Product.update(p.id, {
          lowest_price_90d: null,
          highest_price_90d: null,
          is_low_price: false,
        });
        productsReset++;
      } catch (err) {
        productsFailed++;
        log(`  reset ${p.id} failed: ${err.message}`);
      }
    }
    log(`Reset ${productsReset}/${products.length} products (${productsFailed} failed)`);

    return Response.json({
      success: true,
      deletedHistory,
      historyFailed,
      productsReset,
      productsFailed,
      totalProducts: products.length,
      logs,
      message: `Cleaned ${deletedHistory} historical rows, reset ${productsReset} products`,
    });
  } catch (error) {
    console.error("cleanupHistoricalData error:", error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});