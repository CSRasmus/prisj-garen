import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const EASYPARSER_API_KEY = Deno.env.get("EASYPARSER_API_KEY");

// Extract history points from various possible shapes in Easyparser response.
// The API is known to return arrays under `result.product.performance.*.history`
// or `result.product.price_history`. We accept any structure that gives us
// { date, price } pairs.
function extractPriceHistory(data) {
  const result = data?.result;
  if (!result) return [];

  const candidates = [];
  const product = result.product || result;

  // Common candidate paths — we collect and pick whichever is a non-empty array.
  const push = (v) => { if (Array.isArray(v) && v.length) candidates.push(v); };

  push(product?.performance?.price?.history);
  push(product?.performance?.buybox?.history);
  push(product?.price_history);
  push(product?.history?.prices);
  push(product?.history?.price);
  push(result?.price_history);
  push(result?.history?.price);
  push(result?.sales_analysis?.price_history);

  const arr = candidates[0] || [];

  const normalized = [];
  for (const entry of arr) {
    if (!entry) continue;
    // Accept {date, value} or {timestamp, price} or {date, price}
    const rawDate = entry.date || entry.timestamp || entry.day || entry.recorded_at || entry.at;
    const rawPrice = entry.value ?? entry.price ?? entry.amount;
    if (!rawDate || rawPrice === null || rawPrice === undefined) continue;

    const priceNum = typeof rawPrice === "number"
      ? rawPrice
      : parseFloat(String(rawPrice).replace(/\s/g, "").replace(",", "."));
    if (!priceNum || priceNum < 1 || priceNum > 100000) continue;

    const iso = new Date(rawDate).toISOString();
    if (iso === "Invalid Date" || isNaN(new Date(rawDate).getTime())) continue;

    normalized.push({ checked_at: iso, price: priceNum });
  }
  return normalized;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { asin, debug } = await req.json();
    if (!asin) return Response.json({ error: 'asin required' }, { status: 400 });

    // Skip if we already have historical data for this ASIN
    const existingHistorical = await base44.asServiceRole.entities.GlobalPriceHistory.filter(
      { asin, source: "easyparser_historical" }, "-checked_at", 1
    );
    if (existingHistorical.length > 0 && !debug) {
      return Response.json({ success: true, skipped: true, reason: "already imported", historyCount: 0 });
    }

    const params = new URLSearchParams({
      api_key: EASYPARSER_API_KEY,
      platform: "AMZ",
      operation: "SALES_ANALYSIS_HISTORY",
      domain: ".se",
      asin,
      output: "json",
      history_range: "12",
    });

    const t0 = Date.now();
    const res = await fetch(`https://realtime.easyparser.com/v1/request?${params}`);
    const elapsedMs = Date.now() - t0;

    if (!res.ok) {
      const text = await res.text();
      console.error(`Easyparser HTTP ${res.status} for ${asin}: ${text.substring(0, 300)}`);
      return Response.json({ success: false, error: `HTTP ${res.status}`, body: text.substring(0, 500) }, { status: 500 });
    }

    const data = await res.json();

    // On first test / debug — log full response structure
    if (debug) {
      console.log(`[DEBUG] Full response for ${asin}:`, JSON.stringify(data).substring(0, 5000));
    }

    const reqInfo = data.request_info || {};
    console.log(`Easyparser SALES_ANALYSIS_HISTORY for ${asin}: success=${reqInfo.success} status=${reqInfo.status_code} credits=${reqInfo.credits_used ?? 'n/a'} time=${elapsedMs}ms`);

    if (!reqInfo.success || reqInfo.status_code === 404) {
      return Response.json({
        success: false,
        error: `Easyparser failure: ${JSON.stringify(reqInfo.error_details || reqInfo).substring(0, 200)}`,
        elapsedMs,
      }, { status: 500 });
    }

    const history = extractPriceHistory(data);
    console.log(`Parsed ${history.length} history points for ${asin}`);

    if (debug && history.length === 0) {
      // Help diagnosing path mismatch
      console.log(`[DEBUG] result keys: ${Object.keys(data.result || {}).join(", ")}`);
      if (data.result?.product) {
        console.log(`[DEBUG] product keys: ${Object.keys(data.result.product).join(", ")}`);
        if (data.result.product.performance) {
          console.log(`[DEBUG] performance keys: ${Object.keys(data.result.product.performance).join(", ")}`);
        }
      }
    }

    if (history.length === 0) {
      return Response.json({
        success: true,
        historyCount: 0,
        note: "no history returned",
        elapsedMs,
        credits_used: reqInfo.credits_used ?? null,
        sampleKeys: Object.keys(data.result || {}),
      });
    }

    // Bulk create into GlobalPriceHistory
    const rows = history.map(h => ({
      asin,
      price: h.price,
      currency: "SEK",
      checked_at: h.checked_at,
      amazon_domain: "amazon.se",
      shop_name: "Amazon.se",
      source: "easyparser_historical",
    }));

    // Create in chunks of 100 to be safe
    let created = 0;
    for (let i = 0; i < rows.length; i += 100) {
      const chunk = rows.slice(i, i + 100);
      await base44.asServiceRole.entities.GlobalPriceHistory.bulkCreate(chunk);
      created += chunk.length;
    }

    return Response.json({
      success: true,
      historyCount: created,
      elapsedMs,
      credits_used: reqInfo.credits_used ?? null,
    });
  } catch (error) {
    console.error(`fetchProductHistory error: ${error.message}`);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});