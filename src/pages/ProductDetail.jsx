import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ExternalLink, Clock, TrendingDown, TrendingUp, Package } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { motion } from "framer-motion";
import PriceChart from "@/components/products/PriceChart";
import PriceBadge from "@/components/products/PriceBadge";
import { formatPrice, getPriceStatus, buildAmazonUrl } from "@/lib/affiliateUtils";

function StatCard({ label, value, icon: Icon, highlight = false }) {
  return (
    <div className={`rounded-xl p-4 ${highlight ? "bg-accent" : "bg-secondary/50"}`}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <p className={`text-lg font-bold ${highlight ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}

export default function ProductDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const pathParts = window.location.pathname.split("/");
  const productId = pathParts[pathParts.length - 1];

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
  });

  const product = products.find((p) => p.id === productId);

  const { data: priceHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ["priceHistory", productId],
    queryFn: () => base44.entities.PriceHistory.filter({ product_id: productId }, "-checked_at", 90),
    enabled: !!productId,
  });

  if (productsLoading || historyLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold mb-2">Produkten hittades inte</h2>
        <Link to="/">
          <Button variant="outline">Tillbaka</Button>
        </Link>
      </div>
    );
  }

  const status = getPriceStatus(product.current_price, product.lowest_price_90d, product.highest_price_90d);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" />
          Tillbaka
        </Link>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardContent className="p-5 sm:p-6">
            <div className="flex gap-5 items-start">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.title} className="w-full h-full object-contain p-2" />
                ) : (
                  <Package className="w-10 h-10 text-muted-foreground/40" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 flex-wrap">
                  <PriceBadge status={status} />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold mt-2 leading-tight">{product.title}</h1>
                <p className="text-xs text-muted-foreground mt-1">ASIN: {product.asin}</p>

                <div className="mt-4 flex items-baseline gap-3">
                  <span className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${status === "low" ? "text-primary" : ""}`}>
                    {formatPrice(product.current_price, product.currency)}
                  </span>
                </div>

                <div className="mt-4">
                  <a href={buildAmazonUrl(product.asin)} target="_blank" rel="noopener noreferrer">
                    <Button size="lg" className="gap-2">
                      <ExternalLink className="w-4 h-4" />
                      Köp på Amazon
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Nuvarande"
            value={formatPrice(product.current_price, product.currency)}
            icon={Clock}
            highlight={status === "low"}
          />
          <StatCard
            label="Lägst 90d"
            value={formatPrice(product.lowest_price_90d, product.currency)}
            icon={TrendingDown}
          />
          <StatCard
            label="Högst 90d"
            value={formatPrice(product.highest_price_90d, product.currency)}
            icon={TrendingUp}
          />
          <StatCard
            label="Senast kollat"
            value={product.last_checked ? format(new Date(product.last_checked), "d MMM HH:mm", { locale: sv }) : "—"}
            icon={Clock}
          />
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Prishistorik (90 dagar)</CardTitle>
          </CardHeader>
          <CardContent>
            <PriceChart
              priceHistory={priceHistory}
              lowestPrice={product.lowest_price_90d}
              highestPrice={product.highest_price_90d}
            />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}