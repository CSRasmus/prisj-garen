import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingDown, Flame, ExternalLink, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { weeklyDeals } from "@/functions/weeklyDeals";
import { formatPrice } from "@/lib/affiliateUtils";

const niches = [
  { slug: "hund", label: "🐶 Hund" },
  { slug: "katt", label: "🐱 Katt" },
  { slug: "barn", label: "👶 Barn" },
  { slug: "elektronik", label: "📱 Elektronik" },
  { slug: "hem", label: "🏠 Hem" },
];

export default function Deals() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const loadDeals = async () => {
    setLoading(true);
    try {
      // Cache 1h via sessionStorage
      const cached = sessionStorage.getItem("deals_cache");
      const cachedAt = sessionStorage.getItem("deals_cache_at");
      if (cached && cachedAt && Date.now() - Number(cachedAt) < 60 * 60 * 1000) {
        setDeals(JSON.parse(cached));
        setLoading(false);
        return;
      }
      const res = await weeklyDeals({});
      const fresh = res?.data?.deals || [];
      setDeals(fresh);
      sessionStorage.setItem("deals_cache", JSON.stringify(fresh));
      sessionStorage.setItem("deals_cache_at", String(Date.now()));
    } catch (_) {
      setDeals([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    document.title = "Bästa Amazon Deals just nu | Prisfall";
    const meta = document.querySelector('meta[name="description"]') || (() => {
      const m = document.createElement("meta");
      m.name = "description";
      document.head.appendChild(m);
      return m;
    })();
    meta.setAttribute("content", "De bästa prisfallen på Amazon.se just nu — uppdateras dagligen. Spara pengar på elektronik, husdjur, hem och mer.");

    // Schema.org ItemList
    const schema = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Bästa Amazon Deals just nu",
      description: "De bästa prisfallen på Amazon.se denna vecka",
      itemListElement: deals.map((d, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "Product",
          name: d.title,
          image: d.image_url,
          url: d.amazon_url,
          offers: {
            "@type": "Offer",
            price: d.current_price,
            priceCurrency: "SEK",
            availability: "https://schema.org/InStock",
          },
        },
      })),
    };
    const existing = document.getElementById("deals-schema");
    if (existing) existing.remove();
    if (deals.length > 0) {
      const script = document.createElement("script");
      script.id = "deals-schema";
      script.type = "application/ld+json";
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
    }
    return () => {
      const el = document.getElementById("deals-schema");
      if (el) el.remove();
    };
  }, [deals]);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    loadDeals();
  }, []);

  const handleRefresh = () => {
    sessionStorage.removeItem("deals_cache");
    sessionStorage.removeItem("deals_cache_at");
    loadDeals();
  };

  const handleSignup = () => base44.auth.redirectToLogin();

  return (
    <div className="min-h-screen bg-background font-inter">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">Prisfall</span>
          </Link>
          <div className="hidden sm:flex items-center gap-1 flex-wrap">
            {niches.map((n) => (
              <Link key={n.slug} to={`/${n.slug}`}>
                <Button variant="ghost" size="sm" className="text-xs h-8 px-3">{n.label}</Button>
              </Link>
            ))}
          </div>
          {user ? (
            <Link to="/dashboard"><Button size="sm">Mitt konto</Button></Link>
          ) : (
            <Button onClick={handleSignup} size="sm" className="font-semibold">Kom igång gratis</Button>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="py-16 px-4 text-center bg-gradient-to-b from-accent/40 to-background">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto space-y-5">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-semibold">
            <Flame className="w-4 h-4" /> Uppdateras dagligen
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            🔥 Dagens bästa Amazon-deals
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Aldrig betala för mycket — här är de 5 bästa deals just nu på Amazon.se
          </p>
          {user?.role === "admin" && (
            <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh (admin)
            </Button>
          )}
        </motion.div>
      </section>

      {/* Deals list */}
      <section className="py-12 px-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4 flex gap-4">
                <Skeleton className="w-20 h-20 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-9 w-32" />
                </div>
              </CardContent></Card>
            ))
          ) : deals.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">
              Inga aktuella deals just nu — kom tillbaka imorgon!
            </CardContent></Card>
          ) : (
            deals.map((d, i) => (
              <motion.div
                key={d.asin}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex gap-4">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-muted overflow-hidden shrink-0">
                        {d.image_url && <img src={d.image_url} alt={d.title} className="w-full h-full object-contain p-1" />}
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{d.category_emoji}</span>
                          <span>{d.category}</span>
                        </div>
                        <h3 className="font-semibold text-foreground line-clamp-2 leading-snug">{d.title}</h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-block bg-primary/15 text-primary text-xs font-bold px-2.5 py-1 rounded-full">
                            {d.badge}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-2xl font-extrabold text-primary">{formatPrice(d.current_price)}</span>
                          <span className="text-sm text-muted-foreground line-through">{formatPrice(d.median_price)}</span>
                          <span className="text-xs text-primary font-semibold">−{formatPrice(d.price_drop_kr)}</span>
                        </div>
                        <a href={d.amazon_url} target="_blank" rel="noopener noreferrer sponsored">
                          <Button size="sm" className="gap-1.5 mt-1">
                            Köp på Amazon <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary">
        <div className="max-w-2xl mx-auto px-4 text-center space-y-5">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Vill du få notis på dina favoriter?</h2>
          <p className="text-primary-foreground/80">Lägg till valfri Amazon-produkt — vi mailar dig när priset sjunker.</p>
          <Button onClick={handleSignup} variant="secondary" className="h-12 px-8 font-bold text-primary shadow-xl">
            Skapa konto gratis →
          </Button>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="max-w-5xl mx-auto px-4 text-center text-xs text-muted-foreground space-y-3">
          <div className="flex justify-center gap-6 flex-wrap">
            <Link to="/" className="hover:text-foreground">Start</Link>
            <Link to="/deals" className="hover:text-foreground">Dagens deals</Link>
            <Link to="/blogg" className="hover:text-foreground">Blogg</Link>
            <Link to="/integritetspolicy" className="hover:text-foreground">Integritetspolicy</Link>
            <Link to="/villkor" className="hover:text-foreground">Villkor</Link>
          </div>
          <p>© 2026 Prisfall.se — Vi använder affiliate-länkar från Amazon Associates</p>
        </div>
      </footer>
    </div>
  );
}