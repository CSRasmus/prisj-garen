import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const EASYPARSER_API_KEY = Deno.env.get("EASYPARSER_API_KEY");

// Extract history points from various possible shapes in Easyparser response.
// Tries multiple known/guessed paths and logs which one matched (when debug=true).
function extractPriceHistory(data, debug = false) {
  const result = data?.result;
  if (!result) return [];

  const paths = [
    ["product", "performance", "price", "history"],
    ["product", "performance", "buybox", "history"],
    ["product", "price_history"],
    ["product", "history", "prices"],
    ["product", "history", "price"],
    ["sales_analysis_history"],
    ["sales_analysis", "price_history"],
    ["price", "history"],
    ["history", "prices"],
    ["history", "price"],
    ["price_history"],
    ["history"],
  ];

  let arr = [];
  let matchedPath = null;
  for (const path of paths) {
    let value = result;
    for (const key of path) {
      value = value?.[key];
      if (value === undefined || value === null) break;
    }
    const isArr = Array.isArray(value);
    if (debug) {
      console.log(`[DEBUG] Path result.${path.join(".")}: ${isArr ? `Found ${value.length} items` : (value ? `not array (typeof=${typeof value})` : "null")}`);
    }
    if (isArr && value.length > 0) {
      arr = value;
      matchedPath = path.join(".");
      break;
    }
  }

  if (debug) {
    console.log(`[DEBUG] Matched path: ${matchedPath || "NONE"}`);
    if (arr.length > 0) {
      console.log(`[DEBUG] Sample entry:`, JSON.stringify(arr[0]));
    }
  }

  const normalized = [];
  for (const entry of arr) {
    if (!entry) continue;
    // Accept {date, value} or {timestamp, price} or {date, price}
    const rawDate = entry.date || entry.timestamp || entry.day || entry.recorded_at || entry.at;
    const rawPrice = entry.average_price ?? entry.value ?? entry.price ?? entry.amount;
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

    // Detailed debug logging — chunked to avoid log truncation
    if (debug) {
      console.log("[DEBUG] === Easyparser response structure ===");
      console.log("[DEBUG] Top-level keys:", Object.keys(data).join(", "));
      console.log("[DEBUG] request_info:", JSON.stringify(data.request_info));
      console.log("[DEBUG] result keys:", data.result ? Object.keys(data.result).join(", ") : "null");

      if (data.result) {
        const resultStr = JSON.stringify(data.result);
        console.log("[DEBUG] Result length:", resultStr.length);
        for (let i = 0; i < Math.min(resultStr.length, 8000); i += 1000) {
          console.log(`[DEBUG] Result ${i}-${i + 1000}:`, resultStr.substring(i, i + 1000));
        }
      }
      console.log("[DEBUG] === End response structure ===");
    }

    const reqInfo = data.request_info || {};
    console.log(`Easyparser SALES_ANALYSIS_HISTORY for ${asin}: success=${reqInfo.success} status=${reqInfo.status_code} credits=${reqInfo.credits_used ?? 'n/a'} time=${elapsedMs}ms`);

    // SALES_ANALYSIS_HISTORY does not return reqInfo.success — only status_code.
    if (reqInfo.status_code !== 200 || !data.result) {
      return Response.json({
        success: false,
        error: `Easyparser failure: status_code=${reqInfo.status_code}, has_result=${!!data.result}, details=${JSON.stringify(reqInfo.error_details || reqInfo).substring(0, 200)}`,
        elapsedMs,
      }, { status: 500 });
    }

    const history = extractPriceHistory(data, debug);
    console.log(`Parsed ${history.length} history points for ${asin}`);

    if (history.length === 0) {
      // Return structural sample directly in response so we can see it
      // (console.log gets truncated/dropped in Deno).
      const sample = {};
      if (data.result) {
        sample.resultKeys = Object.keys(data.result);
        if (data.result.history !== undefined) {
          sample.historyType = Array.isArray(data.result.history) ? "array" : typeof data.result.history;
          sample.historyKeys = (data.result.history && typeof data.result.history === "object" && !Array.isArray(data.result.history))
            ? Object.keys(data.result.history) : null;
          sample.historyPreview = JSON.stringify(data.result.history).substring(0, 2000);
        }
        if (data.result.product) {
          sample.productKeys = Object.keys(data.result.product);
          if (data.result.product.price_history) {
            sample.productPriceHistoryPreview = JSON.stringify(data.result.product.price_history).substring(0, 1000);
          }
          if (data.result.product.performance) {
            sample.productPerformanceKeys = Object.keys(data.result.product.performance);
          }
        }
      }
      return Response.json({
        success: true,
        historyCount: 0,
        note: "no history returned",
        elapsedMs,
        credits_used: reqInfo.credits_used ?? null,
        sample,
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

    // Recompute 90d stats from the full GlobalPriceHistory (now including imported data)
    // and update all Product rows tracking this ASIN.
    let productsUpdated = 0;
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const allHistory = await base44.asServiceRole.entities.GlobalPriceHistory.filter(
        { asin, amazon_domain: "amazon.se" }, "-checked_at", 1000
      );
      const recentPrices = allHistory
        .filter(h => new Date(h.checked_at) >= ninetyDaysAgo)
        .map(h => h.price)
        .filter(p => p > 0);

      if (recentPrices.length > 0) {
        const lowest = Math.min(...recentPrices);
        const highest = Math.max(...recentPrices);

        const productsForAsin = await base44.asServiceRole.entities.Product.filter({ asin });
        for (const p of productsForAsin) {
          const isLow = (p.current_price || 0) > 0 && p.current_price <= lowest * 1.05;
          await base44.asServiceRole.entities.Product.update(p.id, {
            lowest_price_90d: lowest,
            highest_price_90d: highest,
            is_low_price: isLow,
          });
          productsUpdated++;
        }
        console.log(`Recomputed 90d for ${asin}: low=${lowest}, high=${highest}, products updated=${productsUpdated}`);
      }
    } catch (err) {
      console.error(`Failed to recompute 90d stats for ${asin}: ${err.message}`);
    }

    return Response.json({
      success: true,
      historyCount: created,
      productsUpdated,
      elapsedMs,
      credits_used: reqInfo.credits_used ?? null,
    });
  } catch (error) {
    console.error(`fetchProductHistory error: ${error.message}`);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});