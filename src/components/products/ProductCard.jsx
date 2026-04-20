import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Trash2, Bell, BellOff, Package, RefreshCw, Clock, ArrowRight } from "lucide-react";
import ShareDealButton from "./ShareDealButton";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import PriceBadge from "./PriceBadge";
import { formatPrice, getPriceStatus, buildAmazonUrl } from "@/lib/affiliateUtils";
import { fetchProductPrice } from "@/functions/fetchProductPrice";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import SparklineChart from "./SparklineChart";
import { base44 } from "@/api/base44Client";

function getPriceDecisionLabel(product) {
  if (!product.current_price || !product.highest_price_90d) return null;
  if (product.is_low_price) {
    return { text: "BRA PRIS — köp nu!", color: "bg-green-100 text-green-700 border border-green-200" };
  }
  if (product.current_price >= product.highest_price_90d * 0.9) {
    return { text: "Högt pris — vänta", color: "bg-red-100 text-red-700 border border-red-200" };
  }
  return { text: "Okej pris", color: "bg-yellow-100 text-yellow-700 border border-yellow-200" };
}

function getPriceComparison(product, priceHistory) {
  if (!product.current_price) return null;
  if (product.is_low_price && priceHistory.length >= 3) {
    const sorted = [...priceHistory].map(h => h.price).sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    const diff = Math.round(median - product.current_price);
    if (diff > 0) return `💰 ${diff} kr billigare än normalt`;
  }
  if (!product.is_low_price && product.lowest_price_90d && product.current_price > product.lowest_price_90d) {
    const diff = Math.round(product.current_price - product.lowest_price_90d);
    return `${diff} kr dyrare än lägsta`;
  }
  return null;
}

export default function ProductCard({ product, onDelete, onToggleNotify, index = 0, onPriceDrop }) {
  const [refreshing, setRefreshing] = useState(false);
  const [priceHistory, setPriceHistory] = useState([]);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const status = getPriceStatus(product.current_price, product.lowest_price_90d, product.highest_price_90d);
  const decisionLabel = getPriceDecisionLabel(product);
  const priceComparison = getPriceComparison(product, priceHistory);

  useEffect(() => {
    base44.entities.PriceHistory.filter({ product_id: product.id }, "-checked_at", 30)
      .then(setPriceHistory)
      .catch(() => {});
  }, [product.id]);

  const handleRefresh = async (e) => {
    e.stopPropagation();
    setRefreshing(true);
    const prevLow = product.is_low_price;
    try {
      await fetchProductPrice({ product_id: product.id, asin: product.asin, title: product.title });
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      const updated = queryClient.getQueryData(["products"])?.find(p => p.id === product.id);
      if (updated?.is_low_price && !prevLow) onPriceDrop?.();
      toast({ title: "Priset har uppdaterats!" });
    } catch (_) {
      toast({ title: "Kunde inte hämta pris, försök igen", variant: "destructive" });
    }
    setRefreshing(false);
  };

  const lastChecked = product.last_checked
    ? formatDistanceToNow(new Date(product.last_checked), { addSuffix: true, locale: sv })
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Card className={`group overflow-hidden hover:shadow-lg transition-all duration-300 border-border/60 ${status === "low" ? "border-primary/40" : ""}`}>
        {status === "low" && (
          <div className="h-0.5 w-full bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
        )}
        <div className="flex gap-4 p-4">
          <Link to={`/product/${product.id}`} className="shrink-0">
            <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-muted flex items-center justify-center overflow-hidden relative ${status === "low" ? "ring-2 ring-primary/30" : ""}`}>
              {status === "low" && (
                <motion.div
                  className="absolute inset-0 rounded-lg bg-primary/10"
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
              {product.image_url ? (
                <img src={product.image_url} alt={product.title} className="w-full h-full object-contain p-1 relative z-10" />
              ) : (
                <Package className="w-8 h-8 text-muted-foreground/40 relative z-10" />
              )}
            </div>
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <Link to={`/product/${product.id}`} className="min-w-0">
                <h3 className="font-semibold text-sm sm:text-base leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                  {product.title}
                </h3>
              </Link>
              {decisionLabel && (
                <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${decisionLabel.color}`}>
                  {decisionLabel.text}
                </span>
              )}
            </div>

            <div className="mt-2 flex items-end justify-between gap-2">
              <div>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className={`text-xl sm:text-2xl font-bold tracking-tight ${status === "low" ? "text-primary" : ""}`}>
                    {formatPrice(product.current_price, product.currency)}
                  </span>
                  {product.lowest_price_90d && product.current_price !== product.lowest_price_90d && (
                    <span className="text-xs text-muted-foreground">
                      Lägst: {formatPrice(product.lowest_price_90d, product.currency)}
                    </span>
                  )}
                </div>
                {priceComparison && (
                  <p className={`text-xs font-medium mt-0.5 ${product.is_low_price ? "text-primary" : "text-muted-foreground"}`}>
                    {priceComparison}
                  </p>
                )}
              </div>
              <SparklineChart priceHistory={priceHistory} />
            </div>

            {lastChecked && (
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                Uppdaterad {lastChecked}
              </div>
            )}

            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <a href={buildAmazonUrl(product.asin)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                {status === "low" ? (
                  <motion.div
                    animate={{ x: [0, 2, 0] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Button variant="default" className="gap-1.5 h-11 px-5 text-sm font-bold shadow-md shadow-primary/20">
                      Köp nu
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </motion.div>
                ) : (
                  <Button variant="outline" className="gap-1.5 h-11 px-4 text-sm">
                    <ExternalLink className="w-3.5 h-3.5" />
                    Köp nu
                  </Button>
                )}
              </a>
              <Button
                variant="ghost"
                className="h-10 text-xs gap-1.5 text-muted-foreground px-3"
                disabled={refreshing}
                onClick={handleRefresh}
              >
                <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Kollar..." : "Uppdatera"}
              </Button>
              <div className="flex flex-col items-start">
                <Button
                  variant="ghost"
                  className="h-10 text-xs gap-1.5 text-muted-foreground px-3"
                  onClick={(e) => { e.stopPropagation(); onToggleNotify(product); }}
                >
                  {product.notify_on_drop ? <><Bell className="w-3 h-3" /> Notis på</> : <><BellOff className="w-3 h-3" /> Notis av</>}
                </Button>
                {product.notify_on_drop && (
                  <span className="text-[10px] text-muted-foreground px-3 -mt-1">Via e-post</span>
                )}
              </div>
              <ShareDealButton product={product} />
              <Button
                variant="ghost"
                className="h-10 text-xs text-destructive hover:text-destructive gap-1.5 px-3"
                onClick={(e) => { e.stopPropagation(); onDelete(product); }}
              >
                <Trash2 className="w-3 h-3" />
                Ta bort
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}