import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Admin-only: loop through all Products that don't yet have imported history
// and call fetchProductHistory for each. 1 second delay between calls.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });

    const products = await base44.asServiceRole.entities.Product.list("-created_date", 1000);
    const logs = [];
    let processed = 0;
    let imported = 0;
    let skipped = 0;
    let failed = 0;
    const seenAsins = new Set();

    for (const product of products) {
      if (!product.asin || seenAsins.has(product.asin)) {
        skipped++;
        continue;
      }
      seenAsins.add(product.asin);

      // Check if historical data already exists for this ASIN
      const existing = await base44.asServiceRole.entities.GlobalPriceHistory.filter(
        { asin: product.asin, source: "easyparser_historical" }, "-checked_at", 1
      );
      if (existing.length > 0) {
        skipped++;
        logs.push(`[SKIP] ${product.asin} — already has historical data`);
        continue;
      }

      try {
        const res = await base44.functions.invoke('fetchProductHistory', { asin: product.asin });
        processed++;
        const data = res?.data || res;
        if (data?.success && data.historyCount > 0) {
          imported++;
          logs.push(`[OK] ${product.asin} — ${data.historyCount} points, ${data.elapsedMs}ms, credits=${data.credits_used ?? 'n/a'}`);
        } else if (data?.success) {
          logs.push(`[EMPTY] ${product.asin} — no history returned`);
        } else {
          failed++;
          logs.push(`[FAIL] ${product.asin} — ${data?.error || 'unknown'}`);
        }
      } catch (err) {
        failed++;
        logs.push(`[ERROR] ${product.asin} — ${err.message}`);
      }

      // 1 second rate-limit between calls
      await new Promise(r => setTimeout(r, 1000));
    }

    return Response.json({
      success: true,
      totalProducts: products.length,
      uniqueAsins: seenAsins.size,
      processed, imported, skipped, failed,
      logs,
    });
  } catch (error) {
    console.error(`adminImportHistories error: ${error.message}`);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});