import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const EASYPARSER_API_KEY = Deno.env.get("EASYPARSER_API_KEY");

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { asin } = await req.json();
    if (!asin) return Response.json({ error: 'ASIN required' }, { status: 400 });

    const doFetch = () => fetch("https://api.easyparser.com/realtime", {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": EASYPARSER_API_KEY },
      body: JSON.stringify({ platform: "AMZ", operation: "DETAIL", domain: ".se", payload: { asin } }),
    });

    let res = await doFetch();
    if (!res.ok) {
      await new Promise(r => setTimeout(r, 3000));
      res = await doFetch();
    }
    const data = await res.json();
    const product = data.data;

    if (!product) {
      console.error("Easyparser no product:", JSON.stringify(data).substring(0, 300));
      return Response.json({ error: "Kunde inte hitta produkten på Amazon.se, kontrollera länken och försök igen" }, { status: 404 });
    }

    const price = product.buybox_winner?.price?.value || product.price?.value || null;

    return Response.json({
      title: product.title,
      image_url: product.main_image?.link || product.images?.[0]?.link || null,
      current_price: price ? parseFloat(price) : null,
      currency: "SEK",
    });
  } catch (error) {
    console.error("lookupProduct error:", error.message);
    return Response.json({ error: "Kunde inte hitta produkten på Amazon.se, kontrollera länken och försök igen" }, { status: 500 });
  }
});