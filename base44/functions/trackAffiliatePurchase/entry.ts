import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Lightweight click logger for affiliate "Köp på Amazon"-clicks.
// Frontend calls this fire-and-forget — we just log so it shows up in function logs.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);

    const { product_id, asin } = await req.json();
    console.log(`[affiliate_click] user=${user?.email || 'anon'} asin=${asin} product_id=${product_id}`);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});