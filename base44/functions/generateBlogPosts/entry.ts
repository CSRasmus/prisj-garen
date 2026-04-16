import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function generateSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function checkAndAdjustSlug(base44, baseSlug) {
  let slug = baseSlug;
  let exists = await base44.asServiceRole.entities.BlogPost.filter({ slug });
  while (exists.length > 0) {
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.random().toString(36).substr(2, 4);
    slug = `${baseSlug}-${today}-${random}`;
    exists = await base44.asServiceRole.entities.BlogPost.filter({ slug });
  }
  return slug;
}

function buildProductsText(products) {
  if (!products || products.length === 0) return "";
  return products.map(p => `${p.title} (${p.current_price} kr)`).join(", ");
}

async function calculatePriceMetrics(globalHistory, asin, days = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const relevantEntries = globalHistory
    .filter(h => h.asin === asin && h.checked_at && new Date(h.checked_at) >= cutoffDate)
    .sort((a, b) => new Date(a.checked_at) - new Date(b.checked_at));

  if (relevantEntries.length === 0) return null;

  const prices = relevantEntries.map(e => e.price);
  const currentPrice = prices[prices.length - 1];
  const lowestPrice = Math.min(...prices);
  const highestPrice = Math.max(...prices);
  const avgPrice = Math.round(prices.reduce((a, b) => a + b) / prices.length);
  
  // Count price drops (where price decreased from previous)
  let dropCount = 0;
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] < prices[i - 1]) dropCount++;
  }

  // Percentage drop from average
  const percentFromAvg = avgPrice > 0 ? Math.round(((avgPrice - currentPrice) / avgPrice) * 100) : 0;

  return {
    currentPrice,
    lowestPrice,
    highestPrice,
    avgPrice,
    dropCount,
    percentFromAvg,
    history: relevantEntries,
  };
}

async function generateArticles(base44) {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Fetch all price history
  const globalHistory = await base44.asServiceRole.entities.GlobalPriceHistory.filter(
    { amazon_domain: "amazon.se" },
    "-checked_at",
    5000
  );

  // Find products with data in last 7 days
  const asinMap = {};
  globalHistory.forEach(h => {
    if (h.checked_at && new Date(h.checked_at) >= sevenDaysAgo) {
      if (!asinMap[h.asin]) asinMap[h.asin] = [];
      asinMap[h.asin].push(h.price);
    }
  });

  const priceDrops = Object.entries(asinMap)
    .map(([asin, prices]) => {
      const latest = prices[0];
      const oldest = prices[prices.length - 1];
      const drop = oldest - latest;
      return { asin, drop, latest };
    })
    .filter(x => x.drop > 0)
    .sort((a, b) => b.drop - a.drop)
    .slice(0, 10);

  // Get product details with full metrics
  const topProducts = [];
  for (const pd of priceDrops) {
    const p = await base44.asServiceRole.entities.Product.filter({ asin: pd.asin }, "-updated_date", 1);
    if (p.length > 0) {
      const metrics = await calculatePriceMetrics(globalHistory, pd.asin, 90);
      if (metrics) {
        topProducts.push({ ...p[0], metrics });
      }
    }
  }

  const lowPriceProducts = await base44.asServiceRole.entities.Product.filter(
    { is_low_price: true },
    "-updated_date",
    15
  );

  // Calculate metrics for low price products
  for (let prod of lowPriceProducts) {
    const metrics = await calculatePriceMetrics(globalHistory, prod.asin, 90);
    if (metrics) prod.metrics = metrics;
  }

  // Determine category rotation (weekly)
  const weekNumber = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
  const categories = ["husdjur", "elektronik", "hem", "deals"];
  const rotatedCategory = categories[weekNumber % categories.length];

  const DISCLAIMER = "<p style='margin-top: 24px; padding: 12px; background: #f3f4f6; border-left: 4px solid #16a34a; font-size: 12px; color: #666;'><strong>Prisdata:</strong> Baseras på PrisJägarens prisdatabas och uppdateras dagligen från Amazon.se.</p>";

  // Generate articles
  const articles = [];

  // Article 1: Weekly Price Analysis (data-driven)
  const weeklyTopProducts = topProducts.slice(0, 5);
  const weeklyProductsData = weeklyTopProducts
    .filter(p => p.metrics)
    .map(p => `${p.title}: nuvarande pris ${p.metrics.currentPrice} kr, lägsta 90d ${p.metrics.lowestPrice} kr, högsta 90d ${p.metrics.highestPrice} kr, genomsnitt ${p.metrics.avgPrice} kr, priset sjunkit ${p.metrics.dropCount} gånger senaste 90 dagarna, ${p.metrics.percentFromAvg}% under genomsnitt`)
    .join(". ");

  const article1Prompt = `Du är en datadriven prisjournalist på svenska. Skriv en SEO-artikel baserad på denna VERKLIG prisdata från Amazon.se denna vecka: ${weeklyProductsData}. 

Artikeln ska kännas som en riktig analys, inte reklam. Inkludera meningar som "Enligt vår prisdata har X sjunkit X% under veckan" och "Genomsnittspriset de senaste 90 dagarna är X kr". 

Skriv 500 ord i HTML-format med <h1>, <h2>, <p>-taggar. Var konkret med siffror och analyser. Avsluta med en CTA att bevaka priser gratis på PrisJägaren (https://prisfall.se).`;

  const article1Response = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: article1Prompt,
    model: "claude_sonnet_4_6",
  });

  const article1Slug = await checkAndAdjustSlug(base44, generateSlug("Veckans prisanalys Amazon"));
  articles.push({
    title: `Veckans prisanalys: Amazon-priser sjönk ${Math.round(weeklyTopProducts[0]?.metrics?.percentFromAvg || 0)}% (Vecka ${weekNumber})`,
    slug: article1Slug,
    content: article1Response + DISCLAIMER,
    excerpt: `Denna vecka sjönk priserna på topp-produkter på Amazon.se. Se vår analys av verklig prisdata.`,
    category: "deals",
    products_mentioned: weeklyTopProducts.map(p => p.asin).join(","),
    seo_title: `Amazon prisanalys vecka ${weekNumber} - Verklig prisdata Sverige | PrisJägaren`,
    seo_description: "Veckans prisanalys baserad på verklig prisdata från Amazon.se. Se vilka produkter som sjunkit mest.",
    featured_image_url: weeklyTopProducts[0]?.image_url || null,
  });

  // Article 2: Deep product price analysis (90-day history)
  if (topProducts.length > 0) {
    const topProduct = topProducts[0];
    const metrics = topProduct.metrics;
    
    const priceHistory = metrics.history
      .map(h => `${new Date(h.checked_at).toLocaleDateString("sv-SE")}: ${h.price} kr`)
      .slice(-20) // Last 20 entries for context
      .join(", ");

    const article2Prompt = `Skriv en djupgående prisanalys på svenska för ${topProduct.title} baserat på denna 90-dagars prishistorik: ${priceHistory}.

Analysera: pristrend (stigande/sjunkande), bästa köptillfällen historiskt, säsongsvariationer om några, och ge en konkret rekommendation om det är bra att köpa nu. Känn dig fri att vara kritisk.

Nuvarande pris: ${metrics.currentPrice} kr, lägsta: ${metrics.lowestPrice} kr, högsta: ${metrics.highestPrice} kr, genomsnitt: ${metrics.avgPrice} kr.

Skriv 400-600 ord i HTML-format med <h1>, <h2>, <p>-taggar.`;

    const article2Response = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: article2Prompt,
      model: "claude_sonnet_4_6",
    });

    const article2Slug = await checkAndAdjustSlug(base44, generateSlug(topProduct.title));
    articles.push({
      title: `${topProduct.title}: Är det bra att köpa nu? (90-dagars prisanalys)`,
      slug: article2Slug,
      content: article2Response + DISCLAIMER,
      excerpt: `Djupanalys av ${topProduct.title} baserad på 90 dagars prisdata från Amazon.se.`,
      category: "elektronik",
      products_mentioned: topProduct.asin,
      seo_title: `${topProduct.title} - 90 dagars prisanalys | PrisJägaren`,
      seo_description: `Djupgående prisanalys för ${topProduct.title}. Är det bra att köpa nu? Se prishistorik och rekommendation.`,
      featured_image_url: topProduct.image_url || null,
    });
  }

  // Article 3: Category price report (monthly)
  const categoryProducts = lowPriceProducts
    .filter(p => p.metrics && p.category === rotatedCategory)
    .slice(0, 8);

  const categoryDataText = categoryProducts
    .map(p => `${p.title}: ${p.metrics.currentPrice} kr (var ${p.metrics.avgPrice} kr i genomsnitt), sjunkit ${p.metrics.percentFromAvg}%`)
    .join(". ");

  const article3Prompt = `Skriv en månadsrapport på svenska om prisutvecklingen för ${rotatedCategory}-produkter på Amazon.se. Basera på denna data: ${categoryDataText}.

Skriv som en riktig konsumentrapport med konkreta siffror och procenttal. Analysera trender, vilka produkter som är billiga just nu, och ge praktiska köptips. 

Skriv 400-500 ord i HTML-format med <h1>, <h2>, <p>-taggar.`;

  const article3Response = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: article3Prompt,
    model: "claude_sonnet_4_6",
  });

  const categoryLabel = { husdjur: "Husdjur", elektronik: "Elektronik", hem: "Hem", deals: "Deals" }[rotatedCategory];
  const article3Slug = await checkAndAdjustSlug(base44, generateSlug(`${categoryLabel} prisrapport Amazon`));
  articles.push({
    title: `${categoryLabel}-prisrapport: April 2026 – Prisdata från Amazon.se`,
    slug: article3Slug,
    content: article3Response + DISCLAIMER,
    excerpt: `Månadsrapport om prisutvecklingen för ${rotatedCategory} på Amazon.se. Vilka produkter är billiga nu?`,
    category: rotatedCategory,
    products_mentioned: categoryProducts.map(p => p.asin).join(","),
    seo_title: `${categoryLabel} prisrapport April 2026 - Amazon.se | PrisJägaren`,
    seo_description: `Månadsrapport: Prisdata för ${rotatedCategory} på Amazon.se. Se vilka produkter som är billiga just nu.`,
    featured_image_url: categoryProducts[0]?.image_url || null,
  });

  // Save all articles
  for (const article of articles) {
    await base44.asServiceRole.entities.BlogPost.create(article);
  }

  return { success: true, articlesCreated: articles.length };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const result = await generateArticles(base44);
    return Response.json(result);
  } catch (error) {
    console.error("generateBlogPosts error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});