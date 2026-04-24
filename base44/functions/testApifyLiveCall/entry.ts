// Admin-only: run a minimal real actor call to surface the EXACT raw Apify response.
// This WILL consume a small amount of Apify credit (~$0.01 if successful) but reveals real errors.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Forbidden: Admin only" }, { status: 403 });
    }

    const apiKey = Deno.env.get("APIFY_API_KEY");
    const actorId = Deno.env.get("APIFY-PRISJAKT-ACTOR-ID");

    if (!apiKey || !actorId) {
      return Response.json({
        ok: false,
        stage: "config",
        message: `Saknade secrets: ${!apiKey ? "APIFY_API_KEY " : ""}${!actorId ? "APIFY-PRISJAKT-ACTOR-ID" : ""}`.trim(),
      }, { status: 200 });
    }

    const body = await req.json().catch(() => ({}));
    // Use actor's documented input schema: searchQuery + maxResults (NOT maxItems/mode)
    const input = {
      searchQuery: body.searchQuery || "airpods",
      maxResults: 1,
    };

    const encodedActorId = actorId.replace("/", "~");
    const url = `https://api.apify.com/v2/acts/${encodedActorId}/run-sync-get-dataset-items?token=${apiKey}&timeout=60`;

    const startedAt = Date.now();
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const responseText = await res.text();
    const elapsedMs = Date.now() - startedAt;

    const responseHeaders = {};
    res.headers.forEach((v, k) => { responseHeaders[k] = v; });

    let parsedBody = null;
    try { parsedBody = JSON.parse(responseText); } catch { /* not JSON */ }

    const apifyErrorType = parsedBody?.error?.type || null;
    const apifyErrorMessage = parsedBody?.error?.message || null;

    let classification = "OK";
    let humanMessage = "Actor-anrop lyckades.";
    if (!res.ok) {
      if (apifyErrorType === "not-enough-usage-to-run-paid-actor" || res.status === 402) {
        classification = "APIFY_OUT_OF_CREDITS";
        humanMessage = "BEKRÄFTAT: Apify-kontot har inte tillräcklig kredit för att köra denna actor (den är 'Pay per event' och kräver betalningsmetod). Fyll på kredit på console.apify.com/billing.";
      } else if (res.status === 401 || res.status === 403) {
        classification = "APIFY_AUTH_ERROR";
        humanMessage = "API-nyckeln avvisades av Apify. Uppdatera APIFY_API_KEY-secret.";
      } else if (res.status === 404) {
        classification = "APIFY_ACTOR_NOT_FOUND";
        humanMessage = "Actorn hittades inte. Kontrollera APIFY-PRISJAKT-ACTOR-ID.";
      } else {
        classification = "APIFY_UNKNOWN_ERROR";
        humanMessage = `Okänt fel (HTTP ${res.status}).`;
      }
    }

    return Response.json({
      ok: res.ok,
      classification,
      humanMessage,
      request: { url: url.replace(apiKey, "REDACTED"), input },
      response: {
        status: res.status,
        elapsedMs,
        headers: responseHeaders,
        body: parsedBody || responseText,
        bodyIsJson: !!parsedBody,
      },
      apifyError: { type: apifyErrorType, message: apifyErrorMessage },
    }, { status: 200 });
  } catch (error) {
    console.error("testApifyLiveCall fatal:", error.message);
    return Response.json({
      ok: false,
      classification: "NETWORK_ERROR",
      humanMessage: `Nätverksfel innan Apify svarade: ${error.message}`,
      error: error.message,
    }, { status: 200 });
  }
});