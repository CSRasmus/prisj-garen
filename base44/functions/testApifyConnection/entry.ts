// Minimal Apify connection test — admins can trigger this to diagnose issues
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const apiKey = Deno.env.get("APIFY_API_KEY");
    const actorId = Deno.env.get("APIFY-PRISJAKT-ACTOR-ID");

    const diagnostics = {
      apiKeyPresent: !!apiKey,
      apiKeyPrefix: apiKey ? apiKey.substring(0, 10) + "..." : null,
      actorIdPresent: !!actorId,
      actorIdValue: actorId || null,
    };

    if (!apiKey) {
      return Response.json({
        ok: false,
        stage: "env",
        diagnostics,
        message: "APIFY_API_KEY saknas i miljövariabler",
      }, { status: 500 });
    }
    if (!actorId) {
      return Response.json({
        ok: false,
        stage: "env",
        diagnostics,
        message: "APIFY-PRISJAKT-ACTOR-ID saknas i miljövariabler",
      }, { status: 500 });
    }

    // Step 1: verify API key + see account usage (cheap — no actor run)
    const userRes = await fetch(`https://api.apify.com/v2/users/me?token=${apiKey}`);
    const userData = await userRes.json();

    if (!userRes.ok) {
      return Response.json({
        ok: false,
        stage: "auth",
        diagnostics,
        message: `Apify API-nyckeln är ogiltig (${userRes.status})`,
        apifyResponse: userData,
      }, { status: 500 });
    }

    const usage = userData?.data?.usage || userData?.data?.plan || null;
    const remainingUsd = userData?.data?.currentBillingPeriodUsage?.usageUsd
      ? (userData?.data?.plan?.maxMonthlyUsageUsd ?? 0) - userData?.data?.currentBillingPeriodUsage?.usageUsd
      : null;

    // Step 2: verify actor exists
    const encodedActorId = actorId.replace("/", "~");
    const actorRes = await fetch(`https://api.apify.com/v2/acts/${encodedActorId}?token=${apiKey}`);
    const actorData = await actorRes.json();

    if (!actorRes.ok) {
      return Response.json({
        ok: false,
        stage: "actor_lookup",
        diagnostics,
        message: `Kunde inte hitta actor "${actorId}" (${actorRes.status})`,
        apifyResponse: actorData,
      }, { status: 500 });
    }

    return Response.json({
      ok: true,
      stage: "ready",
      diagnostics,
      account: {
        username: userData?.data?.username,
        plan: userData?.data?.plan?.id || "unknown",
        usage,
        remainingUsd,
      },
      actor: {
        id: actorData?.data?.id,
        name: actorData?.data?.name,
        title: actorData?.data?.title,
        isPaid: actorData?.data?.isPaid,
        pricingInfos: actorData?.data?.pricingInfos?.[0] || null,
      },
      message: "Apify-anslutning verifierad. Söktjänsten kan använda API:et.",
      note: "Detta test anropar inte själva actorn (för att inte förbruka kredit). Om du fortfarande ser fel vid riktiga sökningar är det sannolikt kreditbrist — uppgradera på https://console.apify.com/billing/subscription",
    });
  } catch (error) {
    console.error("testApifyConnection error:", error.message);
    return Response.json({
      ok: false,
      stage: "network",
      message: error.message,
    }, { status: 500 });
  }
});