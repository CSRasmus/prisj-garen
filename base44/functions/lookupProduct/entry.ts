import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const EASYPARSER_API_KEY = Deno.env.get("EASYPARSER_API_KEY");

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { asin } = await req.json();
    if (!asin) return Response.json({ error: 'ASIN required' }, { status: 400 });

    if (!EASYPARSER_API_KEY) throw new Error("EASYPARSER_API_KEY saknas i miljövariabler");

    const params = new URLSearchParams({ api_key: EASYPARSER_API_KEY, platform: "AMZ", domain: ".se", asin, output: "json", operation: "DETAIL" });
    const res = await fetch(`https://realtime.easyparser.com/v1/request?${params}`);

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Easyparser HTTP ${res.status}:`, errText.substring(0, 300));
      throw new Error(`Easyparser svarade med ${res.status}`);
    }

    const data = await res.json();
    console.log("Easyparser request_info:", JSON.stringify(data.request_info));

    if (!data.request_info?.success || data.request_info?.status_code === 404) {
      return Response.json({ error: "Kunde inte hitta produkten på Amazon.se, kontrollera länken och försök igen" }, { status: 404 });
    }

    const product = data.result?.detail;
    if (!product) {
      console.error("Easyparser no detail in result:", JSON.stringify(Object.keys(data.result || {})));
      return Response.json({ error: "Kunde inte hitta produkten på Amazon.se, kontrollera länken och försök igen" }, { status: 404 });
    }

    // Debug: log exact price fields so we can see what Easyparser returns
    console.log("buybox_winner:", JSON.stringify(product.buybox_winner));
    console.log("product.price:", JSON.stringify(product.price));
    console.log("product.rrp:", JSON.stringify(product.rrp));

    const priceRaw = product.buybox_winner?.price?.value ?? product.price?.value ?? null;
    const price = priceRaw !== null ? parseFloat(String(priceRaw).replace(",", ".")) : null;
    console.log("priceRaw:", priceRaw, "-> parsed:", price);

    return Response.json({
      title: product.title,
      image_url: product.main_image?.link || product.images?.[0]?.link || null,
      current_price: price,
      currency: "SEK",
    });
  } catch (error) {
    console.error("lookupProduct error:", error.name, error.message, error.cause?.message || "");
    return Response.json({ error: "Kunde inte hitta produkten på Amazon.se, kontrollera länken och försök igen" }, { status: 500 });
  }
});