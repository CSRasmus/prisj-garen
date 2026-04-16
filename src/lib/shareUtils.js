const APP_URL = "https://priskoll.base44.app";

export function buildShareText(product) {
  const priceDiff = product.highest_price_90d && product.current_price
    ? Math.round(product.highest_price_90d - product.current_price)
    : null;
  const diffText = priceDiff && priceDiff > 0 ? ` — ${priceDiff} kr billigare än vanligt` : "";
  return `🔥 Prisfall på Amazon!\n\n${product.title} är nu ${product.current_price} kr${diffText}!\n\nHitta fler deals på PrisJägaren 👉 ${APP_URL}`;
}

export async function shareDeal(product, toast) {
  const text = buildShareText(product);
  const url = APP_URL;

  if (navigator.share) {
    try {
      await navigator.share({ title: "PrisJägaren – Prisfall!", text, url });
    } catch (e) {
      // User cancelled — do nothing
    }
  } else {
    await navigator.clipboard.writeText(text);
    toast({ title: "✅ Kopierat!", description: "Texten är kopierad till urklipp." });
  }
}

export function buildReferralUrl(referralCode) {
  return `${APP_URL}?ref=${referralCode}`;
}

export function buildReferralShareText(referralUrl) {
  return `Hej! Jag använder PrisJägaren för att spara pengar på Amazon — helt gratis!\nRegistrera dig här så får vi båda fler bevakningar: ${referralUrl}`;
}

export async function shareReferral(referralCode, toast) {
  const url = buildReferralUrl(referralCode);
  const text = buildReferralShareText(url);

  if (navigator.share) {
    try {
      await navigator.share({ title: "PrisJägaren – Bjud in en vän!", text, url });
    } catch (e) {
      // cancelled
    }
  } else {
    await navigator.clipboard.writeText(url);
    toast({ title: "✅ Länken kopierad!", description: "Din referral-länk är kopierad till urklipp." });
  }
}

export function getMaxProducts(referredCount) {
  const count = referredCount || 0;
  if (count >= 5) return 20;
  if (count >= 3) return 15;
  if (count >= 1) return 12;
  return 10;
}

export function getNextMilestone(referredCount) {
  const count = referredCount || 0;
  if (count >= 5) return null;
  if (count >= 3) return { need: 5, bonus: 20 };
  if (count >= 1) return { need: 3, bonus: 15 };
  return { need: 1, bonus: 12 };
}