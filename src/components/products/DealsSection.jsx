import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Flame, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice, buildAmazonUrl } from "@/lib/affiliateUtils";
import { trackAffiliatePurchase } from "@/functions/trackAffiliatePurchase";

const MIN_DATA_POINTS = 14;

function calcMedian(prices) {
  const valid = prices.filter(p => p != null && !isNaN(p) && p > 0);
  if (!valid.length) return null;
  const sorted = [...valid].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Bug 1 fix: historyByProduct passed as prop from Dashboard — no internal fetch, no useEffect, no infinity loop
// Bug 4 fix: historyByProduct=null means still loading → show skeleton
// Bug 5 fix: use median as "normalpris" instead of highest_price_90d
export default function DealsSection({ products, historyByProduct }) {
  const isLoading = historyByProduct == null;

  // Only show section if there are any is_low_price products
  const hasLowPrice = products.some(p => p.is_low_price);
  if (!hasLowPrice) return null;

  // Bug 4 fix: show skeleton while history data is loading
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-500" />
          <h2 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Dagens deals</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  // Bug 1 fix: pure computation from props, no useEffect needed
  // Bug 5 fix: use median as normalpris
  const deals = products
    .filter(p => {
      if (!p.is_low_price || !p.highest_price_90d || !p.current_price) return false;
      const history = historyByProduct[p.id] || [];
      return history.length >= MIN_DATA_POINTS;
    })
    .map(p => {
      const history = historyByProduct[p.id] || [];
      const median = calcMedian(history.map(h => h.price)) ??
        (p.lowest_price_90d && p.highest_price_90d ? (p.lowest_price_90d + p.highest_price_90d) / 2 : p.highest_price_90d);
      return { ...p, _median: median };
    })
    .sort((a, b) => (b._median - b.current_price) - (a._median - a.current_price))
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
          <span className="ml-auto text-xs text-muted-foreground">
            {deals.length} verifierad{deals.length !== 1 ? "e" : ""} deal{deals.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {deals.length === 0 ? (
        <div className="rounded-2xl border border-border/50 bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          Inga verifierade deals just nu — vi håller koll!
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {deals.map((product, i) => {
            // Bug 5 fix: use median as normalpris
            const normalpris = product._median;
            const drop = normalpris - product.current_price;
            const dropPct = normalpris > 0 ? Math.round((drop / normalpris) * 100) : 0;

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
                      <span className="text-xs line-through text-muted-foreground">{formatPrice(normalpris, product.currency)}</span>
                    </div>
                  </div>
                </div>

                {/* Bug 5 fix: label changed from "normalpris" to "genomsnittspris" */}
                <div className="text-xs text-muted-foreground">
                  {formatPrice(drop, product.currency)} under genomsnittet
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    -{dropPct}%
                  </span>
                  <a href={buildAmazonUrl(product.asin)} target="_blank" rel="noopener noreferrer"
                   onClick={() => trackAffiliatePurchase({ product_id: product.id, asin: product.asin }).catch(() => {})}>
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