import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const RAINFOREST_API_KEY = Deno.env.get("RAINFOREST_API_KEY");

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { asin } = await req.json();
    if (!asin) return Response.json({ error: 'ASIN required' }, { status: 400 });

    const url = `https://api.rainforestapi.com/request?api_key=${RAINFOREST_API_KEY}&type=product&asin=${asin}&amazon_domain=amazon.se`;
    const response = await fetch(url);
    const data = await response.json();

    const product = data.product;
    if (!product) {
      return Response.json({ error: "Kunde inte hitta produkten på Amazon.se, kontrollera länken och försök igen" }, { status: 404 });
    }

    const price = product.buybox_winner?.price?.value || product.price?.value || null;

    return Response.json({
      title: product.title,
      image_url: product.main_image?.link || null,
      current_price: price ? parseFloat(price) : null,
      currency: "SEK",
    });
  } catch (error) {
    return Response.json({ error: "Kunde inte hitta produkten på Amazon.se, kontrollera länken och försök igen" }, { status: 500 });
  }
});