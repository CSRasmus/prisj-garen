import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const AFFILIATE_TAG = "priskoll-21";

function buildAmazonUrl(asin) {
  return `https://www.amazon.se/dp/${asin}?tag=${AFFILIATE_TAG}`;
}

function median(values) {
  if (!values || values.length === 0) return null;
  const sorted = [...values].filter(v => typeof v === "number" && !isNaN(v) && v > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Detect category from product title (fallback when no category field exists)
function detectCategory(title = "") {
  const t = title.toLowerCase();
  if (/\b(hund|valp|dogg|dog)\b/.test(t)) return { key: "husdjur", label: "Husdjur", emoji: "🐶" };
  if (/\b(katt|cat|kitten)\b/.test(t)) return { key: "husdjur", label: "Husdjur", emoji: "🐱" };
  if (/\b(barn|baby|leksak|toy|kid)\b/.test(t)) return { key: "barn", label: "Barn", emoji: "👶" };
  if (/\b(iphone|samsung|airpods|hörlur|headphone|laptop|tv|monitor|tangentbord|keyboard|mus|mouse|usb|kabel|laddare|charger|elektron)\b/.test(t)) {
    return { key: "elektronik", label: "Elektronik", emoji: "📱" };
  }
  if (/\b(sport|gym|löpning|training|cykel|bike|yoga)\b/.test(t)) return { key: "sport", label: "Sport", emoji: "🏃" };
  if (/\b(hem|kök|kitchen|möbel|stol|bord|lampa|sängkläder)\b/.test(t)) return { key: "hem", label: "Hem", emoji: "🏠" };
  return { key: "övrigt", label: "Övrigt", emoji: "🛍️" };
}

export async function computeWeeklyDeals(base44, opts = {}) {
  const products = await base44.asServiceRole.entities.Product.list("-last_checked", 1000);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const candidates = [];
  const stats = { total: products.length, no_asin: 0, no_price: 0, low_history: 0, no_recent: 0, no_median: 0, drop_too_small: 0, qualified: 0 };

  // Dedupe by ASIN (multiple users may track same product)
  const seenAsins = new Set();

  for (const product of products) {
    if (!product.asin) { stats.no_asin++; continue; }
    if (!product.current_price || product.current_price <= 0) { stats.no_price++; continue; }
    if (seenAsins.has(product.asin)) continue;
    seenAsins.add(product.asin);

    const history = await base44.asServiceRole.entities.GlobalPriceHistory.filter(
      { asin: product.asin }, "-checked_at", 500
    );

    if (history.length < 14) { stats.low_history++; continue; }

    const recent = history.filter(h => h.checked_at && new Date(h.checked_at) >= sevenDaysAgo);
    if (recent.length === 0) { stats.no_recent++; continue; }

    const last90d = history.filter(h => h.checked_at && new Date(h.checked_at) >= ninetyDaysAgo);
    const medianPrice = median(last90d.map(h => h.price));
    if (!medianPrice || medianPrice <= 0) { stats.no_median++; continue; }

    const dropPercent = ((medianPrice - product.current_price) / medianPrice) * 100;
    // TODO: Höj tillbaka till 10% när databasen har 100+ produkter
    if (dropPercent < 5) { stats.drop_too_small++; continue; }
    stats.qualified++;

    // Determine badge: lowest in N months?
    const allPrices = history.map(h => h.price).filter(p => typeof p === "number" && p > 0);
    const minHistorical = Math.min(...allPrices);
    const isLowest = product.current_price <= minHistorical * 1.01;

    let monthsCovered = 0;
    if (history.length > 0) {
      const oldestDate = new Date(history[history.length - 1].checked_at);
      const now = new Date();
      monthsCovered = Math.round((now - oldestDate) / (1000 * 60 * 60 * 24 * 30));
    }

    const badge = isLowest && monthsCovered >= 3
      ? `Lägsta på ${monthsCovered} mån!`
      : `${Math.round(dropPercent)}% rabatt`;

    candidates.push({
      asin: product.asin,
      title: product.title,
      image_url: product.image_url,
      current_price: Math.round(product.current_price),
      median_price: Math.round(medianPrice),
      price_drop_kr: Math.round(medianPrice - product.current_price),
      price_drop_percent: Math.round(dropPercent * 10) / 10,
      amazon_url: buildAmazonUrl(product.asin),
      category: detectCategory(product.title),
      badge,
      _datapoints: history.length,
    });
  }

  // Sort: drop% desc, then datapoints desc
  candidates.sort((a, b) => {
    if (b.price_drop_percent !== a.price_drop_percent) return b.price_drop_percent - a.price_drop_percent;
    return b._datapoints - a._datapoints;
  });

  // Diversify by category — pick best per category, then fill remaining
  const picked = [];
  const usedCategories = new Set();

  for (const c of candidates) {
    if (picked.length >= 5) break;
    if (!usedCategories.has(c.category.key)) {
      picked.push(c);
      usedCategories.add(c.category.key);
    }
  }
  for (const c of candidates) {
    if (picked.length >= 5) break;
    if (!picked.includes(c)) picked.push(c);
  }

  // Strip internal field
  const result = picked.map(({ _datapoints, ...rest }) => ({
    ...rest,
    category: rest.category.label,
    category_emoji: rest.category.emoji,
  }));
  if (opts.withStats) return { deals: result, stats };
  return result;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const result = await computeWeeklyDeals(base44, { withStats: !!body?.debug });
    if (body?.debug) {
      return Response.json({ deals: result.deals, count: result.deals.length, stats: result.stats });
    }
    return Response.json({ deals: result, count: result.length });
  } catch (error) {
    console.error("weeklyDeals error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});