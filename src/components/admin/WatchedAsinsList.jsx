import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function WatchedAsinsList() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const products = await base44.entities.Product.list("-created_date", 5000);
      const map = new Map();
      for (const p of products) {
        const key = p.asin || p.prisjakt_id;
        if (!key) continue;
        const existing = map.get(key);
        if (existing) {
          existing.watchers += 1;
          if (!existing.title && p.title) existing.title = p.title;
          if (!existing.current_price && p.current_price) existing.current_price = p.current_price;
        } else {
          map.set(key, {
            key,
            title: p.title || "—",
            current_price: p.current_price || null,
            watchers: 1,
          });
        }
      }
      const list = Array.from(map.values()).sort((a, b) => b.watchers - a.watchers);
      setRows(list);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  function copyAll() {
    if (!rows) return;
    const text = rows.map(r => r.key).join("\n");
    navigator.clipboard.writeText(text);
  }

  const filtered = rows
    ? rows.filter(r =>
        !filter ||
        r.key.toLowerCase().includes(filter.toLowerCase()) ||
        (r.title || "").toLowerCase().includes(filter.toLowerCase())
      )
    : [];

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Visar alla unika ASIN/Prisjakt-ID som är aktivt bevakade av minst en användare, sorterat efter antal bevakare.
      </p>

      <div className="flex gap-2">
        <Button onClick={load} disabled={loading} variant="outline" className="gap-2">
          {loading ? "Laddar..." : rows ? "Uppdatera" : "Visa bevakade ASINs"}
        </Button>
        {rows && (
          <Button onClick={copyAll} variant="ghost" size="sm">
            Kopiera alla ({rows.length})
          </Button>
        )}
      </div>

      {error && (
        <div className="text-sm px-4 py-3 rounded-lg bg-destructive/10 text-destructive">
          Fel: {error}
        </div>
      )}

      {rows && (
        <>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{rows.length}</span> unika nycklar ·{" "}
            <span className="font-semibold text-foreground">
              {rows.reduce((s, r) => s + r.watchers, 0)}
            </span>{" "}
            totala bevakningar
          </div>

          <Input
            placeholder="Filtrera ASIN eller titel..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />

          <div className="bg-muted rounded-lg overflow-hidden border border-border">
            <div className="grid grid-cols-[120px_1fr_80px_60px] gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground bg-card border-b border-border">
              <span>ASIN/ID</span>
              <span>Titel</span>
              <span className="text-right">Pris</span>
              <span className="text-right">👥</span>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              {filtered.map((r) => (
                <div
                  key={r.key}
                  className="grid grid-cols-[120px_1fr_80px_60px] gap-2 px-3 py-2 text-xs border-b border-border last:border-b-0 hover:bg-card"
                >
                  <code className="font-mono text-foreground truncate">{r.key}</code>
                  <span className="truncate text-muted-foreground" title={r.title}>{r.title}</span>
                  <span className="text-right text-muted-foreground">
                    {r.current_price ? `${Math.round(r.current_price)} kr` : "—"}
                  </span>
                  <span className="text-right font-semibold text-primary">{r.watchers}</span>
                </div>
              ))}
              {filtered.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">
                  Inga träffar
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}