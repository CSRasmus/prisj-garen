import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Flame, Trophy, ExternalLink, Bell, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { formatPrice, buildAmazonUrl } from "@/lib/affiliateUtils";
import BestSellerCard from "@/components/deals/BestSellerCard";
import { weeklyDeals } from "@/functions/weeklyDeals";
import { useQuickWatch } from "@/lib/useQuickWatch";

const CATEGORIES = [
  { label: "Alla", slug: "all", emoji: "✨" },
  { label: "Husdjur", slug: "husdjur", emoji: "🐶" },
  { label: "Elektronik", slug: "elektronik", emoji: "🔌" },
  { label: "Hem & kök", slug: "hem", emoji: "🍳" },
  { label: "Barnprodukter", slug: "barn", emoji: "👶" },
  { label: "Sport & fritid", slug: "sport", emoji: "🎮" },
  { label: "Böcker", slug: "bocker", emoji: "📚" },
  { label: "Hälsa", slug: "halsa", emoji: "💊" },
  { label: "Trädgård", slug: "tradgard", emoji: "🌱" },
];

export default function Deals() {
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    document.title = "Populära produkter på Amazon.se | Prisfall";
    const meta = document.querySelector('meta[name="description"]') || (() => {
      const m = document.createElement("meta");
      m.name = "description";
      document.head.appendChild(m);
      return m;
    })();
    meta.content = "De mest populära produkterna på Amazon.se just nu — bevaka priser och få notis vid prisfall";
  }, []);

  // Verified deals (real price drops on tracked products)
  const { data: dealsResponse, isLoading: loadingDeals } = useQuery({
    queryKey: ["weekly-deals-public"],
    queryFn: () => weeklyDeals({}),
    staleTime: 1000 * 60 * 30,
  });
  const verifiedDeals = useMemo(() => {
    const list = dealsResponse?.data?.deals || [];
    return list.filter((d) => d.type !== "bestseller");
  }, [dealsResponse]);

  // Best sellers (catalog)
  const { data: bestSellers = [], isLoading: loadingBest } = useQuery({
    queryKey: ["best-sellers-all"],
    queryFn: () =>
      base44.entities.BestSellerProduct.filter(
        { active: true },
        "current_rank",
        100
      ),
    initialData: [],
  });

  const filteredBestSellers = useMemo(() => {
    if (activeCategory === "all") return bestSellers;
    return bestSellers.filter((b) => b.category_slug === activeCategory);
  }, [bestSellers, activeCategory]);

  const filteredVerified = useMemo(() => {
    if (activeCategory === "all") return verifiedDeals;
    return verifiedDeals.filter((d) => d.category_slug === activeCategory);
  }, [verifiedDeals, activeCategory]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-30 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            Tillbaka
          </Link>
          <Link to="/dashboard">
            <Button size="sm" variant="outline">Mitt konto</Button>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            🏆 Populära produkter på Amazon.se
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Här ser du vad som säljs mest just nu inom olika kategorier. Klicka <strong>"Bevaka"</strong> för att få notis när priset sjunker — gratis.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Listan uppdateras varje måndag.
          </p>
        </motion.div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => setActiveCategory(cat.slug)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                activeCategory === cat.slug
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border hover:bg-accent"
              }`}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Verified deals section */}
        {filteredVerified.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-5 h-5 text-destructive" />
              <h2 className="text-xl font-bold">🔥 Riktiga prisfall just nu</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVerified.map((deal, i) => (
                <VerifiedDealCard key={deal.asin} deal={deal} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* Best sellers section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h2 className="text-xl font-bold">🏆 Bästsäljare just nu</h2>
          </div>

          {loadingBest ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-72 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : filteredBestSellers.length === 0 ? (
            <p className="text-muted-foreground text-sm">Inga bästsäljare i den här kategorin än.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredBestSellers.map((product, i) => (
                <BestSellerCard
                  key={product.id}
                  product={{
                    ...product,
                    amazon_url: buildAmazonUrl(product.asin),
                  }}
                  index={i}
                />
              ))}
            </div>
          )}
        </section>

        {loadingDeals && filteredVerified.length === 0 && (
          <p className="text-xs text-muted-foreground mt-6">Laddar prisfall…</p>
        )}
      </main>
    </div>
  );
}

function VerifiedDealCard({ deal, index }) {
  const { watch, watchingAsin } = useQuickWatch();
  const isWatching = watchingAsin === deal.asin;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 6) * 0.05 }}
    >
      <Card className="overflow-hidden hover:shadow-md transition-shadow h-full">
        <CardContent className="p-4 flex gap-3">
          {deal.image_url && (
            <div className="w-24 h-24 rounded-lg bg-muted overflow-hidden shrink-0">
              <img src={deal.image_url} alt={deal.title} className="w-full h-full object-contain p-1" loading="lazy" />
            </div>
          )}
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <span>{deal.category_emoji}</span>
              <span>{deal.category}</span>
            </div>
            <h3 className="font-semibold text-sm line-clamp-2 leading-snug mb-1.5">{deal.title}</h3>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-lg font-extrabold text-primary">{formatPrice(deal.current_price)}</span>
              {deal.price_drop_percent ? (
                <span className="text-xs font-bold text-destructive">−{deal.price_drop_percent}%</span>
              ) : null}
            </div>
            <div className="mt-auto flex gap-2">
              <a href={deal.amazon_url} target="_blank" rel="noopener noreferrer sponsored" className="flex-1">
                <Button size="sm" className="w-full gap-1.5 text-xs">
                  Köp <ExternalLink className="w-3 h-3" />
                </Button>
              </a>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                disabled={isWatching}
                onClick={() => watch({ asin: deal.asin, title: deal.title, image_url: deal.image_url })}
              >
                {isWatching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bell className="w-3 h-3" />}
                Bevaka
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}