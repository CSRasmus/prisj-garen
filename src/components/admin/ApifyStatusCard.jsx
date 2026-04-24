import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Play, Zap, ExternalLink } from "lucide-react";
import { testApifyConnection } from "@/functions/testApifyConnection";
import { testApifyLiveCall } from "@/functions/testApifyLiveCall";

export default function ApifyStatusCard() {
  const [loading, setLoading] = useState(false);
  const [liveLoading, setLiveLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [liveResult, setLiveResult] = useState(null);

  const runTest = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await testApifyConnection({});
      setResult(res.data);
    } catch (e) {
      setResult(e.response?.data || { ok: false, message: e.message });
    }
    setLoading(false);
  };

  const runLiveTest = async () => {
    setLiveLoading(true);
    setLiveResult(null);
    try {
      const res = await testApifyLiveCall({ searchQuery: "airpods" });
      setLiveResult(res.data);
    } catch (e) {
      setLiveResult(e.response?.data || { ok: false, humanMessage: e.message });
    }
    setLiveLoading(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">🔌 Apify-diagnostik</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* TEST 1: Kreditfri kontroll */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Steg 1 — Verifiera nyckel & actor (ingen kredit)</p>
          <Button onClick={runTest} disabled={loading} size="sm" className="gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {loading ? "Testar..." : "Testa anslutning"}
          </Button>

          {result && (
            <div className={`rounded-lg p-3 text-xs space-y-1.5 ${result.ok ? "bg-primary/10 border border-primary/30" : "bg-destructive/10 border border-destructive/30"}`}>
              <div className="flex items-center gap-2 font-semibold text-sm">
                {result.ok
                  ? <><CheckCircle2 className="w-4 h-4 text-primary" /> Anslutning OK</>
                  : <><XCircle className="w-4 h-4 text-destructive" /> {result.message || "Misslyckades"}</>}
              </div>
              {result.diagnostics && (
                <div>
                  <p>API-nyckel: {result.diagnostics.apiKeyPresent ? `✅ ${result.diagnostics.apiKeyPrefix}` : "❌ saknas"}</p>
                  <p>Actor-ID: {result.diagnostics.actorIdPresent ? `✅ ${result.diagnostics.actorIdValue}` : "❌ saknas"}</p>
                </div>
              )}
              {result.account && (
                <div className="pt-1.5 border-t border-border/40">
                  <p>Konto: <strong>{result.account.username}</strong> — Plan: <strong>{result.account.plan}</strong></p>
                </div>
              )}
              {result.actor && (
                <div className="pt-1.5 border-t border-border/40">
                  <p>Actor: <strong>{result.actor.title || result.actor.name}</strong></p>
                  <p>Betald actor: {result.actor.isPaid ? "⚠️ Ja (kräver kredit)" : "Nej"}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* TEST 2: Live-anrop */}
        <div className="space-y-2 pt-2 border-t">
          <p className="text-sm font-medium">Steg 2 — Verkligt actor-anrop (kostar ~$0.01 om det lyckas)</p>
          <p className="text-xs text-muted-foreground">
            Kör actorn med <code className="bg-muted px-1 rounded">searchQuery: "airpods", maxResults: 1</code> och visar exakt vad Apify svarar.
          </p>
          <Button onClick={runLiveTest} disabled={liveLoading} size="sm" variant="outline" className="gap-2">
            {liveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {liveLoading ? "Kör actor..." : "Kör live-anrop"}
          </Button>

          {liveResult && (
            <div className={`rounded-lg p-3 text-xs space-y-2 ${liveResult.ok ? "bg-primary/10 border border-primary/30" : "bg-destructive/10 border border-destructive/30"}`}>
              <div className="flex items-center gap-2 font-semibold text-sm">
                {liveResult.ok
                  ? <><CheckCircle2 className="w-4 h-4 text-primary" /> Actor-anrop lyckades</>
                  : <><XCircle className="w-4 h-4 text-destructive" /> {liveResult.classification || "Misslyckades"}</>}
              </div>

              {liveResult.humanMessage && (
                <p className="font-medium">{liveResult.humanMessage}</p>
              )}

              {liveResult.classification === "APIFY_OUT_OF_CREDITS" && (
                <a
                  href="https://console.apify.com/billing/subscription"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary font-medium hover:underline"
                >
                  Öppna Apify Billing <ExternalLink className="w-3 h-3" />
                </a>
              )}

              {liveResult.response && (
                <div className="pt-1.5 border-t border-border/40 space-y-0.5">
                  <p><strong>HTTP-status:</strong> {liveResult.response.status}</p>
                  <p><strong>Svarstid:</strong> {liveResult.response.elapsedMs} ms</p>
                </div>
              )}

              {liveResult.apifyError?.type && (
                <div className="pt-1.5 border-t border-border/40">
                  <p><strong>Apify-feltyp:</strong> <code className="bg-background/60 px-1 rounded">{liveResult.apifyError.type}</code></p>
                  <p className="mt-1"><strong>Apify-meddelande:</strong></p>
                  <p className="mt-0.5 italic">{liveResult.apifyError.message}</p>
                </div>
              )}

              <details className="pt-1.5 border-t border-border/40">
                <summary className="cursor-pointer font-medium">Fullständigt råsvar</summary>
                <pre className="text-[10px] mt-2 bg-background/50 p-2 rounded overflow-x-auto max-h-64">
                  {JSON.stringify(liveResult, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}