import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingDown, Eye, Tag, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatPrice } from "@/lib/affiliateUtils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function StatsWidget({ products, maxProducts = 10 }) {
  const totalWatched = products.length;
  const lowPriceItems = products.filter((p) => p.is_low_price);
  const lowPriceCount = lowPriceItems.length;

  // Fetch price history for all low-price products to compute real averages
  const lowPriceIds = lowPriceItems.map((p) => p.id);

  const { data: allHistory = [] } = useQuery({
    queryKey: ["priceHistory", "lowPriceItems", lowPriceIds.join(",")],
    queryFn: async () => {
      if (lowPriceIds.length === 0) return [];
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90);
      const results = await Promise.all(
        lowPriceIds.map((id) =>
          base44.entities.PriceHistory.filter({ product_id: id }, "-checked_at", 500)
        )
      );
      return results.flat().filter((h) => new Date(h.checked_at) >= cutoff);
    },
    enabled: lowPriceIds.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  // Build a map of product_id -> average price from history
  const avgByProduct = useMemo(() => {
    const map = {};
    for (const id of lowPriceIds) {
      const points = allHistory.filter((h) => h.product_id === id).map((h) => h.price);
      if (points.length > 0) {
        map[id] = points.reduce((a, b) => a + b, 0) / points.length;
      }
    }
    return map;
  }, [allHistory, lowPriceIds]);

  // Savings = sum of (avgPrice - currentPrice) for each low-price product
  const totalSavings = useMemo(() => {
    return lowPriceItems.reduce((sum, p) => {
      let avg;
      if (avgByProduct[p.id] != null) {
        avg = avgByProduct[p.id];
      } else if (p.highest_price_90d != null && p.lowest_price_90d != null) {
        avg = (p.highest_price_90d + p.lowest_price_90d) / 2;
      } else {
        return sum;
      }
      return sum + Math.max(0, avg - (p.current_price || 0));
    }, 0);
  }, [lowPriceItems, avgByProduct]);

  const stats = [
    {
      icon: Eye,
      label: "Bevakade produkter",
      value: `${totalWatched}/${maxProducts}`,
      color: "text-foreground",
      highlight: false,
    },
    {
      icon: Tag,
      label: "Lågt pris just nu",
      value: lowPriceCount,
      color: "text-primary",
      highlight: lowPriceCount > 0,
    },
    {
      icon: TrendingDown,
      label: "Du sparar mot genomsnittspris",
      value: totalSavings > 0 ? formatPrice(totalSavings) : "—",
      color: "text-primary",
      highlight: totalSavings > 0,
      tooltip:
        "Beräknat som skillnaden mellan genomsnittspriset och dagens pris de senaste 90 dagarna",
    },
  ];

  return (
    <TooltipProvider delayDuration={200}>
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className={`rounded-2xl p-3 sm:p-4 border ${stat.highlight ? "bg-accent border-primary/25" : "bg-card border-border/60"}`}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
              <span className="text-xs text-muted-foreground leading-tight">{stat.label}</span>
              {stat.tooltip && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 text-muted-foreground/60 cursor-help shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px] text-xs">
                    {stat.tooltip}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <p className={`text-lg sm:text-xl font-bold tracking-tight ${stat.color}`}>
              {stat.value}
            </p>
          </motion.div>
        ))}
      </div>
    </TooltipProvider>
  );
}