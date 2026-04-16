import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { asin } = await req.json();
    if (!asin) return Response.json({ error: 'ASIN required' }, { status: 400 });

    const products = await base44.asServiceRole.entities.Product.filter({ asin });
    return Response.json({ count: products.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});