import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Flame, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice, buildAmazonUrl } from "@/lib/affiliateUtils";
import { base44 } from "@/api/base44Client";

const MIN_DATA_POINTS = 14;

export default function DealsSection({ products }) {
  const [counts, setCounts] = useState({});

  // Fetch PriceHistory counts for all is_low_price products
  useEffect(() => {
    const lowProducts = products.filter(p => p.is_low_price && p.current_price && p.highest_price_90d);
    if (!lowProducts.length) return;
    Promise.all(
      lowProducts.map(p =>
        base44.entities.PriceHistory.filter({ product_id: p.id }, "-checked_at", 60)
          .then(h => ({ id: p.id, count: h.length }))
          .catch(() => ({ id: p.id, count: 0 }))
      )
    ).then(results => {
      const map = {};
      results.forEach(r => { map[r.id] = r.count; });
      setCounts(map);
    });
  }, [products]);

  // Only show if there are any is_low_price products at all
  const hasLowPrice = products.some(p => p.is_low_price);
  if (!hasLowPrice) return null;

  // Verified deals: 14+ data points AND is_low_price
  const deals = products
    .filter(p => p.is_low_price && p.highest_price_90d && p.current_price && (counts[p.id] ?? 0) >= MIN_DATA_POINTS)
    .sort((a, b) => (b.highest_price_90d - b.current_price) - (a.highest_price_90d - a.current_price))
    .slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2">
        <Flame className="w-4 h-4 text-orange-500" />
        <h2 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Dagens deals</h2>
        {deals.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">{deals.length} verifierad{deals.length !== 1 ? "e" : ""} deal{deals.length !== 1 ? "s" : ""}</span>
        )}
      </div>

      {deals.length === 0 ? (
        <div className="rounded-2xl border border-border/50 bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          Inga verifierade deals just nu — vi håller koll!
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {deals.map((product, i) => {
            const drop = product.highest_price_90d - product.current_price;
            const dropPct = Math.round((drop / product.highest_price_90d) * 100);

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.12 + i * 0.06 }}
                className="rounded-2xl border border-primary/30 bg-accent p-4 flex flex-col gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-16 h-16 rounded-xl bg-card flex items-center justify-center overflow-hidden shrink-0">
                    {product.image_url ? (
                      <img src={product.image_url} alt="" className="w-full h-full object-contain p-0.5" />
                    ) : (
                      <Package className="w-6 h-6 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link to={`/product/${product.id}`}>
                      <p className="font-semibold text-xs line-clamp-2 hover:text-primary transition-colors">{product.title}</p>
                    </Link>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-base font-extrabold text-primary">{formatPrice(product.current_price, product.currency)}</span>
                      <span className="text-xs line-through text-muted-foreground">{formatPrice(product.highest_price_90d, product.currency)}</span>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  {formatPrice(drop, product.currency)} under normalpris
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    -{dropPct}%
                  </span>
                  <a href={buildAmazonUrl(product.asin)} target="_blank" rel="noopener noreferrer">
                    <Button className="h-11 text-sm gap-1.5 px-4 font-bold">
                      Köp nu →
                    </Button>
                  </a>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}