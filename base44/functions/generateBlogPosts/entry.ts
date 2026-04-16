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
  let counter = 1;
  while (exists.length > 0) {
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    slug = `${baseSlug}-${today}`;
    exists = await base44.asServiceRole.entities.BlogPost.filter({ slug });
    counter++;
  }
  return slug;
}

function buildProductsText(products) {
  if (!products || products.length === 0) return "";
  return products.map(p => `${p.title} (${p.current_price} kr)`).join(", ");
}

async function generateArticles(base44) {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Fetch top products with price drops in last 7 days
  const globalHistory = await base44.asServiceRole.entities.GlobalPriceHistory.filter(
    { amazon_domain: "amazon.se" },
    "-checked_at",
    1000
  );

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

  // Get product details
  const topProducts = [];
  for (const pd of priceDrops) {
    const p = await base44.asServiceRole.entities.Product.filter({ asin: pd.asin }, "-updated_date", 1);
    if (p.length > 0) topProducts.push(p[0]);
  }

  const lowPriceProducts = await base44.asServiceRole.entities.Product.filter(
    { is_low_price: true },
    "-updated_date",
    10
  );

  // Determine category rotation (weekly)
  const weekNumber = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
  const categories = ["husdjur", "elektronik", "hem", "deals"];
  const rotatedCategory = categories[weekNumber % categories.length];

  // Generate articles
  const articles = [];

  // Article 1: Weekly Best Deals
  const productsTextDeals = buildProductsText(topProducts.slice(0, 5));
  const article1Prompt = `Du är en svensk deals-skribent. Skriv ett engagerande SEO-optimerat blogginlägg på svenska om veckans bästa deals på Amazon.se. Inkludera dessa produkter med deras priser: ${productsTextDeals}. Artikeln ska vara 400-600 ord, ha en H1-rubrik, 3-4 H2-rubriker, och vara optimerad för sökordet 'Amazon deals Sverige vecka ${Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))}'. Skriv i HTML-format med <h1>, <h2>, <p>-taggar. Avsluta med en CTA att bevaka priser gratis på PrisJägaren.`;

  const article1Response = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: article1Prompt,
    model: "claude_sonnet_4_6",
  });

  const article1Slug = await checkAndAdjustSlug(base44, generateSlug("Veckans bästa deals Amazon"));
  articles.push({
    title: `Veckans bästa deals på Amazon (Vecka ${weekNumber})`,
    slug: article1Slug,
    content: article1Response,
    excerpt: article1Response.substring(0, 150),
    category: "deals",
    products_mentioned: topProducts.slice(0, 5).map(p => p.asin).join(","),
    seo_title: `Amazon deals Sverige - Vecka ${weekNumber} | PrisJägaren`,
    seo_description: "Veckans bästa deals och prigsfall på Amazon.se. Spara hundratals kronor på elektronik, hem och mer.",
    featured_image_url: topProducts[0]?.image_url || null,
  });

  // Article 2: Price analysis of top product with biggest drop
  if (topProducts.length > 0) {
    const topProduct = topProducts[0];
    const article2Prompt = `Skriv en SEO-optimerad prisanalys på svenska för ${topProduct.title} på Amazon.se. Inkludera: nuvarande pris ${topProduct.current_price} kr, lägsta pris senaste 90 dagarna ${topProduct.lowest_price_90d} kr, högsta pris ${topProduct.highest_price_90d} kr, prishistorik-analys, när är bästa tiden att köpa, och en rekommendation. 300-500 ord i HTML-format med <h1>, <h2>, <p>-taggar. Optimera för sökordet '${topProduct.title} pris Sverige'.`;

    const article2Response = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: article2Prompt,
      model: "claude_sonnet_4_6",
    });

    const article2Slug = await checkAndAdjustSlug(base44, generateSlug(topProduct.title));
    articles.push({
      title: `${topProduct.title} – Prisanalys & köpguide`,
      slug: article2Slug,
      content: article2Response,
      excerpt: article2Response.substring(0, 150),
      category: "elektronik",
      products_mentioned: topProduct.asin,
      seo_title: `${topProduct.title} pris Sverige - Köpguide | PrisJägaren`,
      seo_description: `Prisanalys för ${topProduct.title}. Lägsta pris senaste 90 dagarna, prishistorik och köptips.`,
      featured_image_url: topProduct.image_url || null,
    });
  }

  // Article 3: Category guide
  const categoryProducts = lowPriceProducts.filter(p => p.category === rotatedCategory).slice(0, 5);
  const productsTextCategory = buildProductsText(categoryProducts);
  const article3Prompt = `Skriv en köpguide på svenska för ${rotatedCategory}-produkter på Amazon.se. Inkludera tips om när priser brukar sjunka, hur man hittar bästa deals, och nämn dessa aktuella låga priser: ${productsTextCategory}. 400-600 ord i HTML-format med <h1>, <h2>, <p>-taggar. Optimera för nyckelord relaterat till ${rotatedCategory}.`;

  const article3Response = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: article3Prompt,
    model: "claude_sonnet_4_6",
  });

  const categoryLabel = { husdjur: "Husdjur", elektronik: "Elektronik", hem: "Hem", deals: "Deals" }[rotatedCategory];
  const article3Slug = await checkAndAdjustSlug(base44, generateSlug(`${categoryLabel} köpguide Amazon`));
  articles.push({
    title: `${categoryLabel}-guide: Sådan hittar du bästa deals på Amazon`,
    slug: article3Slug,
    content: article3Response,
    excerpt: article3Response.substring(0, 150),
    category: rotatedCategory,
    products_mentioned: categoryProducts.map(p => p.asin).join(","),
    seo_title: `${categoryLabel} på Amazon - Köpguide & pristips | PrisJägaren`,
    seo_description: `Komplett köpguide för ${rotatedCategory} på Amazon.se. Spara pengar och hitta bästa deals.`,
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