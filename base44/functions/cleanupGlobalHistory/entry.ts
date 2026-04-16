import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Monthly scheduled job: removes GlobalPriceHistory entries older than 365 days
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 365);

    let deleted = 0;
    let batchSize = 1000;

    // Loop until no more old entries exist (handles >1000 records)
    while (true) {
      const all = await base44.asServiceRole.entities.GlobalPriceHistory.list("-checked_at", batchSize);
      const old = all.filter(h => new Date(h.checked_at) < cutoffDate);

      if (old.length === 0) break;

      for (const entry of old) {
        await base44.asServiceRole.entities.GlobalPriceHistory.delete(entry.id);
        deleted++;
      }

      console.log(`Deleted batch of ${old.length}, total so far: ${deleted}`);

      // If we got fewer than batchSize total records, we've processed everything
      if (all.length < batchSize) break;
    }

    console.log(`Cleanup complete: deleted ${deleted} GlobalPriceHistory entries older than 365 days`);
    return Response.json({ deleted });
  } catch (error) {
    console.error("cleanupGlobalHistory error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});