import React from "react";
import { motion } from "framer-motion";
import { TrendingDown, Eye, Tag } from "lucide-react";
import { formatPrice } from "@/lib/affiliateUtils";

export default function StatsWidget({ products }) {
  const totalWatched = products.length;
  const lowPriceCount = products.filter((p) => p.is_low_price).length;

  // Estimate savings: sum of (highest - current) for low-price items
  const totalSaved = products
    .filter((p) => p.is_low_price && p.highest_price_90d && p.current_price)
    .reduce((sum, p) => sum + Math.max(0, p.highest_price_90d - p.current_price), 0);

  const stats = [
    {
      icon: Eye,
      label: "Bevakade produkter",
      value: `${totalWatched}/10`,
      color: "text-foreground",
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
      label: "Potentiell besparing",
      value: totalSaved > 0 ? formatPrice(totalSaved) : "—",
      color: "text-primary",
      highlight: totalSaved > 0,
    },
  ];

  return (
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
            <span className="text-xs text-muted-foreground">{stat.label}</span>
          </div>
          <p className={`text-lg sm:text-xl font-bold tracking-tight ${stat.color}`}>{stat.value}</p>
        </motion.div>
      ))}
    </div>
  );
}