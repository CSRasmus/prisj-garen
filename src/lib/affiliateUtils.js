const AFFILIATE_TAG = "priskoll-21";

export function addAffiliateTag(url) {
  if (!url) return url;
  const urlObj = new URL(url);
  urlObj.searchParams.set("tag", AFFILIATE_TAG);
  return urlObj.toString();
}

export function buildAmazonUrl(asin) {
  return `https://www.amazon.se/dp/${asin}?tag=${AFFILIATE_TAG}`;
}

export function formatPrice(price, currency = "SEK") {
  if (price == null) return "—";
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

export function getPriceStatus(currentPrice, lowestPrice90d, highestPrice90d) {
  if (!currentPrice || !lowestPrice90d || !highestPrice90d) return "unknown";
  const range = highestPrice90d - lowestPrice90d;
  if (range === 0) return "stable";
  const position = (currentPrice - lowestPrice90d) / range;
  if (position <= 0.15) return "low";
  if (position >= 0.75) return "high";
  return "normal";
}