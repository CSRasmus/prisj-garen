import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Monthly scheduled job: removes GlobalPriceHistory entries older than 365 days
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 365);
    const cutoffIso = cutoff.toISOString();

    // Fetch all old entries
    const old = await base44.asServiceRole.entities.GlobalPriceHistory.filter(
      { checked_at: { $lt: cutoffIso } }, "checked_at", 1000
    );

    let deleted = 0;
    for (const entry of old) {
      await base44.asServiceRole.entities.GlobalPriceHistory.delete(entry.id);
      deleted++;
    }

    console.log(`Cleanup complete: deleted ${deleted} GlobalPriceHistory entries older than 365 days`);
    return Response.json({ deleted });
  } catch (error) {
    console.error("cleanupGlobalHistory error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});