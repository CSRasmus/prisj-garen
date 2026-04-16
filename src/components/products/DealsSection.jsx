import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Flame, ExternalLink, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice, buildAmazonUrl, getPriceStatus } from "@/lib/affiliateUtils";

export default function DealsSection({ products }) {
  // Show products with low price, sorted by biggest drop (highest - current)
  const deals = products
    .filter((p) => p.is_low_price && p.highest_price_90d && p.current_price)
    .sort((a, b) => (b.highest_price_90d - b.current_price) - (a.highest_price_90d - a.current_price))
    .slice(0, 3);

  if (deals.length === 0) return null;

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
        <span className="ml-auto text-xs text-muted-foreground">{deals.length} produkt{deals.length !== 1 && "er"} med lågt pris</span>
      </div>

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
                <div className="w-12 h-12 rounded-xl bg-card flex items-center justify-center overflow-hidden shrink-0">
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

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  -{dropPct}% ({formatPrice(drop, product.currency)})
                </span>
                <a href={buildAmazonUrl(product.asin)} target="_blank" rel="noopener noreferrer">
                  <Button className="h-11 text-sm gap-1.5 px-4">
                    <ExternalLink className="w-3.5 h-3.5" />
                    Köp
                  </Button>
                </a>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}