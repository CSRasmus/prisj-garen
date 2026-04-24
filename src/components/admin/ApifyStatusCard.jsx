import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Play } from "lucide-react";
import { testApifyConnection } from "@/functions/testApifyConnection";

export default function ApifyStatusCard() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [rawError, setRawError] = useState(null);

  const runTest = async () => {
    setLoading(true);
    setResult(null);
    setRawError(null);
    try {
      const res = await testApifyConnection({});
      setResult(res.data);
    } catch (e) {
      // axios-style error — try to extract server response
      setRawError(e.response?.data || { message: e.message });
      setResult(e.response?.data || null);
    }
    setLoading(false);
  };

  const ok = result?.ok;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          🔌 Apify-anslutning
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Testar anslutning till Apify (verifierar API-nyckel och actor — förbrukar ingen kredit).
        </p>

        <Button onClick={runTest} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {loading ? "Testar..." : "Testa Apify-anslutning"}
        </Button>

        {result && (
          <div className={`rounded-lg p-4 text-sm space-y-2 ${ok ? "bg-primary/10 border border-primary/30" : "bg-destructive/10 border border-destructive/30"}`}>
            <div className="flex items-center gap-2 font-semibold">
              {ok
                ? <><CheckCircle2 className="w-4 h-4 text-primary" /> Anslutning OK</>
                : <><XCircle className="w-4 h-4 text-destructive" /> Anslutning misslyckades</>
              }
            </div>
            {result.message && <p>{result.message}</p>}
            {result.stage && <p><strong>Steg:</strong> {result.stage}</p>}

            {result.diagnostics && (
              <div className="pt-2 border-t border-border/50 space-y-0.5">
                <p><strong>API-nyckel:</strong> {result.diagnostics.apiKeyPresent ? `✅ ${result.diagnostics.apiKeyPrefix}` : "❌ saknas"}</p>
                <p><strong>Actor-ID:</strong> {result.diagnostics.actorIdPresent ? `✅ ${result.diagnostics.actorIdValue}` : "❌ saknas"}</p>
              </div>
            )}

            {result.account && (
              <div className="pt-2 border-t border-border/50 space-y-0.5">
                <p><strong>Apify-konto:</strong> {result.account.username}</p>
                <p><strong>Plan:</strong> {result.account.plan}</p>
                {result.account.remainingUsd !== null && (
                  <p><strong>Kvarvarande kredit:</strong> ${result.account.remainingUsd?.toFixed(2)}</p>
                )}
              </div>
            )}

            {result.actor && (
              <div className="pt-2 border-t border-border/50 space-y-0.5">
                <p><strong>Actor:</strong> {result.actor.title || result.actor.name}</p>
                <p><strong>Betald actor:</strong> {result.actor.isPaid ? "Ja" : "Nej"}</p>
              </div>
            )}

            {result.note && (
              <p className="pt-2 border-t border-border/50 text-xs text-muted-foreground">{result.note}</p>
            )}

            {result.apifyResponse && (
              <details className="pt-2 border-t border-border/50">
                <summary className="cursor-pointer font-medium text-xs">Råsvar från Apify</summary>
                <pre className="text-xs mt-2 bg-background/50 p-2 rounded overflow-x-auto">
                  {JSON.stringify(result.apifyResponse, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}

        {rawError && !result && (
          <div className="rounded-lg p-4 text-sm bg-destructive/10 border border-destructive/30">
            <div className="flex items-center gap-2 font-semibold mb-2">
              <XCircle className="w-4 h-4 text-destructive" /> Nätverksfel
            </div>
            <pre className="text-xs bg-background/50 p-2 rounded overflow-x-auto">
              {JSON.stringify(rawError, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}