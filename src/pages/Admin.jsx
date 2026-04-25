import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { importBestSellers } from "@/functions/importBestSellers";
import { checkPrices } from "@/functions/checkPrices";
import { generateBlogPosts } from "@/functions/generateBlogPosts";
import { adminImportHistories } from "@/functions/adminImportHistories";

export default function Admin() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  const [bsrRunning, setBsrRunning] = useState(false);
  const [bsrLogs, setBsrLogs] = useState([]);
  const [bsrResult, setBsrResult] = useState(null);

  const [checkRunning, setCheckRunning] = useState(false);
  const [checkResult, setCheckResult] = useState(null);

  const [blogRunning, setBlogRunning] = useState(false);
  const [blogResult, setBlogResult] = useState(null);

  const [historyRunning, setHistoryRunning] = useState(false);
  const [historyResult, setHistoryResult] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);

  useEffect(() => {
    async function init() {
      try {
        const me = await base44.auth.me();
        setUser(me);
        if (me?.role === "admin") await loadStats();
      } catch (_) {}
      setLoading(false);
    }
    init();
  }, []);

  async function loadStats() {
    const [products, users, partners, allHistory] = await Promise.all([
      base44.entities.Product.list(),
      base44.entities.User.list(),
      base44.entities.Partner.list(),
      base44.entities.GlobalPriceHistory.list("-checked_at", 5000),
    ]);
    const uniqueAsins = new Set(allHistory.map(h => h.asin)).size;
    const activePartners = partners.filter(p => p.active).length;
    const totalOwed = partners.reduce((s, p) => s + (p.total_owed || 0), 0);
    setStats({
      uniqueAsins,
      totalWatchings: products.length,
      totalUsers: users.length,
      activePartners,
      totalOwed,
    });
  }

  async function runImportBestSellers() {
    setBsrRunning(true);
    setBsrLogs([]);
    setBsrResult(null);
    try {
      const res = await importBestSellers({});
      setBsrLogs(res.data?.logs || []);
      setBsrResult(res.data);
      await loadStats();
    } catch (err) {
      setBsrResult({ error: err.message });
    }
    setBsrRunning(false);
  }

  async function runCheckPrices() {
    setCheckRunning(true);
    setCheckResult(null);
    try {
      const res = await checkPrices({});
      setCheckResult(res.data);
    } catch (err) {
      setCheckResult({ error: err.message });
    }
    setCheckRunning(false);
  }

  async function runImportHistories() {
    setHistoryRunning(true);
    setHistoryResult(null);
    setHistoryLogs([]);
    try {
      const res = await adminImportHistories({});
      setHistoryResult(res.data);
      setHistoryLogs(res.data?.logs || []);
    } catch (err) {
      setHistoryResult({ error: err.message });
    }
    setHistoryRunning(false);
  }

  async function runGenerateBlog() {
    setBlogRunning(true);
    setBlogResult(null);
    try {
      const res = await generateBlogPosts({});
      setBlogResult(res.data);
    } catch (err) {
      setBlogResult({ error: err.message });
    }
    setBlogRunning(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <p className="text-2xl">🔒</p>
          <p className="font-semibold text-foreground">Åtkomst nekad</p>
          <p className="text-sm text-muted-foreground">Den här sidan kräver admin-behörighet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-inter">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">⚙️ Admin — Prisfall</h1>
          <p className="text-sm text-muted-foreground mt-1">Inloggad som {user.email}</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <StatCard label="Unika ASINs (GlobalHistory)" value={stats.uniqueAsins} />
            <StatCard label="Aktiva bevakningar" value={stats.totalWatchings} />
            <StatCard label="Användare" value={stats.totalUsers} />
            <StatCard label="Aktiva partners" value={stats.activePartners} />
            <StatCard label="Kommission utestående" value={`${stats.totalOwed} kr`} />
          </div>
        )}

        {/* Import Best Sellers */}
        <Section title="📦 Importera bästsäljare (80 produkter)">
          <p className="text-sm text-muted-foreground mb-3">
            Hämtar top 10 produkter från 8 kategorier via Easyparser (BEST_SELLERS med SEARCH-fallback). Sparar i <code>BestSellerProduct</code> + seedar live-pris i <code>GlobalPriceHistory</code>. Tar ~2-5 minuter. Kostar ~30-50 credits.
          </p>
          <Button onClick={runImportBestSellers} disabled={bsrRunning} className="gap-2">
            {bsrRunning ? <><Spinner /> Importerar (kan ta 2-5 min)...</> : "Importera bästsäljare"}
          </Button>

          {bsrResult && !bsrRunning && (
            <div className={`mt-3 text-sm px-4 py-3 rounded-lg ${bsrResult.error ? "bg-destructive/10 text-destructive" : "bg-accent text-accent-foreground"}`}>
              {bsrResult.error
                ? `Fel: ${bsrResult.error}`
                : `✅ Klart: ${bsrResult.imported} importerade, ${bsrResult.skipped} hoppades över, ${bsrResult.errors} fel — ${bsrResult.api_calls} API-anrop`}
            </div>
          )}

          {bsrResult?.per_category && !bsrRunning && (
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              {Object.entries(bsrResult.per_category).map(([cat, s]) => (
                <div key={cat} className="bg-muted rounded-lg px-3 py-2">
                  <p className="font-semibold">{cat}</p>
                  <p className="text-muted-foreground">
                    {s.imported} imp · {s.skipped} skip · {s.errors} err
                    <span className="ml-1 opacity-60">({s.source})</span>
                  </p>
                </div>
              ))}
            </div>
          )}

          {bsrLogs.length > 0 && (
            <div className="mt-3 bg-muted rounded-lg p-3 max-h-80 overflow-y-auto">
              {bsrLogs.map((log, i) => (
                <p key={i} className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">{log}</p>
              ))}
            </div>
          )}
        </Section>

        {/* Check Prices */}
        <Section title="🔄 Kör daglig priskoll">
          <p className="text-sm text-muted-foreground mb-3">
            Kör checkPrices manuellt — uppdaterar alla bevakade produkter och skickar notiser vid prisfall.
          </p>
          <Button onClick={runCheckPrices} disabled={checkRunning} variant="outline" className="gap-2">
            {checkRunning ? <><Spinner /> Kör priskoll...</> : "Kör daglig priskoll nu"}
          </Button>
          {checkResult && !checkRunning && (
            <div className={`mt-3 text-sm px-4 py-3 rounded-lg ${checkResult.error ? "bg-destructive/10 text-destructive" : "bg-accent text-accent-foreground"}`}>
              {checkResult.error ? `Fel: ${checkResult.error}` : `✅ ${checkResult.message || JSON.stringify(checkResult)}`}
            </div>
          )}
        </Section>

        {/* Partner management */}
        <Section title="🤝 Partners">
          <p className="text-sm text-muted-foreground mb-3">
            Hantera fysiska samarbetspartners — djurfrisörer, uppfödare, kurshållare m.fl.
          </p>
          <Link to="/admin/partners">
            <Button variant="outline" className="gap-2">Hantera partners →</Button>
          </Link>
        </Section>

        {/* Import 12-month history */}
        <Section title="📈 Hämta prishistorik (12 mån) för alla produkter">
          <p className="text-sm text-muted-foreground mb-3">
            Kör <code>fetchProductHistory</code> för varje unik ASIN som saknar historisk import. 1 sekund mellan anrop. Detta kostar Easyparser-credits (en per produkt).
          </p>
          <Button onClick={runImportHistories} disabled={historyRunning} variant="outline" className="gap-2">
            {historyRunning ? <><Spinner /> Importerar historik...</> : "Hämta historik för alla produkter utan historik"}
          </Button>

          {historyResult && !historyRunning && (
            <div className={`mt-3 text-sm px-4 py-3 rounded-lg ${historyResult.error ? "bg-destructive/10 text-destructive" : "bg-accent text-accent-foreground"}`}>
              {historyResult.error
                ? `Fel: ${historyResult.error}`
                : `✅ ${historyResult.uniqueAsins} unika ASINs: ${historyResult.imported} importerade, ${historyResult.skipped} hoppades över, ${historyResult.failed} fel`}
            </div>
          )}

          {historyLogs.length > 0 && (
            <div className="mt-3 bg-muted rounded-lg p-3 max-h-64 overflow-y-auto">
              {historyLogs.map((log, i) => (
                <p key={i} className="text-xs font-mono text-muted-foreground">{log}</p>
              ))}
            </div>
          )}
        </Section>

        {/* Generate Blog Posts */}
        <Section title="✍️ Generera blogginlägg">
          <p className="text-sm text-muted-foreground mb-3">
            Kör generateBlogPosts manuellt för att skapa nya SEO-artiklar.
          </p>
          <Button onClick={runGenerateBlog} disabled={blogRunning} variant="outline" className="gap-2">
            {blogRunning ? <><Spinner /> Genererar...</> : "Generera blogginlägg nu"}
          </Button>
          {blogResult && !blogRunning && (
            <div className={`mt-3 text-sm px-4 py-3 rounded-lg ${blogResult.error ? "bg-destructive/10 text-destructive" : "bg-accent text-accent-foreground"}`}>
              {blogResult.error ? `Fel: ${blogResult.error}` : `✅ Klart: ${JSON.stringify(blogResult)}`}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 text-center">
      <p className="text-2xl font-extrabold text-primary">{value ?? "—"}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-2">
      <h2 className="font-bold text-foreground">{title}</h2>
      {children}
    </div>
  );
}

function Spinner() {
  return <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />;
}