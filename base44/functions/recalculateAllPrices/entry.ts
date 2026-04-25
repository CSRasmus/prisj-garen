import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const EASYPARSER_API_KEY = Deno.env.get("EASYPARSER_API_KEY");

function parsePrice(raw) {
  if (raw == null) return NaN;
  return parseFloat(String(raw).replace(/\s/g, "").replace(/,(\d{3})/g, "$1").replace(",", "."));
}

async function fetchBuyboxPrice(asin) {
  const params = new URLSearchParams({
    api_key: EASYPARSER_API_KEY,
    platform: "AMZ",
    domain: ".se",
    asin,
    output: "json",
    operation: "DETAIL",
  });
  const res = await fetch(`https://realtime.easyparser.com/v1/request?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data.request_info?.success || !data.result?.detail) {
    throw new Error(`No detail: ${JSON.stringify(data.request_info).substring(0, 150)}`);
  }
  const d = data.result.detail;
  const priceRaw = d.buybox_winner?.price?.value ?? d.price?.value ?? d.rrp?.value ?? null;
  const price = parsePrice(priceRaw);
  if (!price || price < 1 || price > 100000) throw new Error(`Invalid price: ${priceRaw}`);
  const imageUrl = d.main_image?.link || d.images?.[0]?.link || null;
  return { price, imageUrl };
}

// Admin-only: re-fetches live buybox price for every Product, recomputes 90d stats
// using LIVE data only, and corrects any product whose current_price was set from
// historical average_price (multi-seller weekly avg).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const products = await base44.asServiceRole.entities.Product.list("-created_date", 1000);
    const logs = [];
    let processed = 0;
    let priceChanged = 0;
    let failed = 0;
    const seenAsins = new Map(); // asin -> { price, imageUrl } so we don't re-fetch duplicates

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (!p.asin) {
        logs.push(`[SKIP] ${p.id} — no ASIN`);
        continue;
      }

      try {
        // Re-use price if we already fetched this ASIN in this run
        let result = seenAsins.get(p.asin);
        if (!result) {
          result = await fetchBuyboxPrice(p.asin);
          seenAsins.set(p.asin, result);
          await new Promise(r => setTimeout(r, 1500)); // rate limit
        }

        const { price: livePrice, imageUrl } = result;
        const now = new Date().toISOString();
        const today = now.substring(0, 10);

        // Save today's live price to GlobalPriceHistory (deduped per ASIN per day)
        const recentGlobal = await base44.asServiceRole.entities.GlobalPriceHistory.filter(
          { asin: p.asin, amazon_domain: "amazon.se" }, "-checked_at", 5
        );
        const alreadySavedToday = recentGlobal.some(h => h.checked_at?.substring(0, 10) === today && h.source !== "easyparser_historical");
        if (!alreadySavedToday) {
          await base44.asServiceRole.entities.GlobalPriceHistory.create({
            asin: p.asin, price: livePrice, currency: "SEK",
            checked_at: now, amazon_domain: "amazon.se", source: "live",
          });
        }

        // Recompute 90d stats — LIVE data only
        const cutoff90d = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
        const allHistory = await base44.asServiceRole.entities.GlobalPriceHistory.filter(
          { asin: p.asin, amazon_domain: "amazon.se" }, "-checked_at", 500
        );
        const recent = allHistory.filter(h => h.checked_at && h.checked_at >= cutoff90d);
        const livePrices = [...recent.filter(h => h.source !== "easyparser_historical").map(h => h.price), livePrice].filter(v => v > 0);
        const allPrices = [...recent.map(h => h.price), livePrice].filter(v => v > 0);

        let lowest, highest, isLow;
        if (livePrices.length >= 7) {
          lowest = Math.min(...livePrices);
          highest = Math.max(...livePrices);
          isLow = livePrice <= lowest * 1.05;
        } else {
          lowest = Math.min(...allPrices);
          highest = Math.max(...allPrices);
          isLow = false;
        }

        const oldPrice = p.current_price;
        const diff = oldPrice ? Math.abs(livePrice - oldPrice) : 0;
        const pctDiff = oldPrice ? Math.round((diff / oldPrice) * 100) : 0;

        const updateData = {
          current_price: livePrice,
          currency: "SEK",
          lowest_price_90d: lowest,
          highest_price_90d: highest,
          is_low_price: isLow,
          last_checked: now,
        };
        if (imageUrl) updateData.image_url = imageUrl;

        await base44.asServiceRole.entities.Product.update(p.id, updateData);

        if (pctDiff >= 5) {
          priceChanged++;
          logs.push(`[FIXED] ${p.asin} — ${oldPrice} → ${livePrice} SEK (${pctDiff}% diff), low/high: ${lowest}/${highest}, isLow=${isLow}`);
        } else {
          logs.push(`[OK] ${p.asin} — ${livePrice} SEK (no significant change)`);
        }
        processed++;
      } catch (err) {
        failed++;
        logs.push(`[FAIL] ${p.asin || p.id} — ${err.message}`);
      }
    }

    const msg = `Recalculated ${processed} products, ${priceChanged} had >=5% price difference, ${failed} failed`;
    console.log(msg);
    return Response.json({
      success: true,
      total: products.length,
      processed,
      priceChanged,
      failed,
      uniqueAsins: seenAsins.size,
      logs,
      message: msg,
    });
  } catch (error) {
    console.error("recalculateAllPrices error:", error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});