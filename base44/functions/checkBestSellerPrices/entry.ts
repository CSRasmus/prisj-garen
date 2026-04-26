import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const EASYPARSER_API_KEY = Deno.env.get("EASYPARSER_API_KEY");

function parsePrice(raw) {
  if (raw == null) return NaN;
  return parseFloat(String(raw).replace(/\s/g, "").replace(/,(\d{3})/g, "$1").replace(",", "."));
}

const CRON_SECRET = Deno.env.get("CRON_SECRET");

async function fetchDetail(asin) {
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
  return parsePrice(priceRaw);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Auth: allow CRON_SECRET (scheduled) OR admin user (manual)
    const url = new URL(req.url);
    const providedSecret = url.searchParams.get("secret");
    const hasValidSecret = CRON_SECRET && providedSecret === CRON_SECRET;

    if (!hasValidSecret) {
      const user = await base44.auth.me().catch(() => null);
      if (!user || user.role !== "admin") {
        console.warn("checkBestSellerPrices: unauthorized call blocked");
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // Fetch all active best sellers, sorted by oldest update first so each run
    // picks up the products that were not refreshed in previous runs.
    const bestSellers = await base44.asServiceRole.entities.BestSellerProduct.filter(
      { active: true }, "updated_date", 5000
    );

    if (bestSellers.length === 0) {
      return Response.json({ message: "No best sellers to update", updated: 0 });
    }

    // Time-budget: stop well before the platform 504s (~4 min observed).
    // Each product = Easyparser DETAIL (~1-2s) + history filter + update + 1.5s rate-limit
    // ≈ 4-5s/product in practice → ~35 products per 3 min budget.
    const startedAt = Date.now();
    const TIME_BUDGET_MS = 3 * 60 * 1000; // 3 minutes

    let updated = 0;
    let errors = 0;
    let processed = 0;
    const now = new Date().toISOString();
    const today = now.substring(0, 10);

    for (let i = 0; i < bestSellers.length; i++) {
      if (Date.now() - startedAt > TIME_BUDGET_MS) {
        console.log(`Time budget reached after ${processed} products — stopping early`);
        break;
      }

      const b = bestSellers[i];
      processed++;

      try {
        const price = await fetchDetail(b.asin);
        if (!price || price < 1 || price > 100000) {
          console.warn(`Invalid price for ${b.asin}: ${price}`);
          errors++;
          continue;
        }

        // Dedupe per ASIN per day in GlobalPriceHistory
        const recent = await base44.asServiceRole.entities.GlobalPriceHistory.filter(
          { asin: b.asin, amazon_domain: "amazon.se" }, "-checked_at", 5
        );
        const alreadySavedToday = recent.some(h => h.checked_at?.substring(0, 10) === today);

        if (!alreadySavedToday) {
          await base44.asServiceRole.entities.GlobalPriceHistory.create({
            asin: b.asin,
            price,
            currency: "SEK",
            checked_at: now,
            amazon_domain: "amazon.se",
            source: "live",
          });
        }

        // Update BestSellerProduct.current_price (also bumps updated_date so it
        // moves to the back of the queue on the next scheduled run).
        await base44.asServiceRole.entities.BestSellerProduct.update(b.id, {
          current_price: price,
        });

        updated++;
        console.log(`[${i + 1}/${bestSellers.length}] ${b.asin} → ${price} SEK`);
      } catch (err) {
        console.error(`[${i + 1}/${bestSellers.length}] ${b.asin}: ${err.message}`);
        errors++;
      }

      // Rate limit
      if (i < bestSellers.length - 1) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    const remaining = bestSellers.length - processed;
    const msg = `Best seller price check: ${updated}/${processed} updated, ${errors} errors (${remaining} remaining for next run)`;
    console.log(msg);
    return Response.json({ message: msg, updated, processed, total: bestSellers.length, remaining, errors });
  } catch (error) {
    console.error("checkBestSellerPrices fatal:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});