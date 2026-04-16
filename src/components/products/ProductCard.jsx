import React from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Trash2, Bell, BellOff, Package } from "lucide-react";
import { motion } from "framer-motion";
import PriceBadge from "./PriceBadge";
import { formatPrice, getPriceStatus, buildAmazonUrl } from "@/lib/affiliateUtils";

export default function ProductCard({ product, onDelete, onToggleNotify, index = 0 }) {
  const status = getPriceStatus(product.current_price, product.lowest_price_90d, product.highest_price_90d);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 border-border/60">
        <div className="flex gap-4 p-4">
          <Link to={`/product/${product.id}`} className="shrink-0">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.title}
                  className="w-full h-full object-contain p-1"
                />
              ) : (
                <Package className="w-8 h-8 text-muted-foreground/40" />
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
              <PriceBadge status={status} />
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              <span className={`text-xl sm:text-2xl font-bold tracking-tight ${status === "low" ? "text-primary" : ""}`}>
                {formatPrice(product.current_price, product.currency)}
              </span>
              {product.lowest_price_90d && product.current_price !== product.lowest_price_90d && (
                <span className="text-xs text-muted-foreground">
                  Lägst: {formatPrice(product.lowest_price_90d, product.currency)}
                </span>
              )}
            </div>

            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <a
                href={buildAmazonUrl(product.asin)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                <Button size="sm" variant={status === "low" ? "default" : "outline"} className="gap-1.5 h-8 text-xs">
                  <ExternalLink className="w-3 h-3" />
                  Köp nu
                </Button>
              </a>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs gap-1.5 text-muted-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleNotify(product);
                }}
              >
                {product.notify_on_drop ? (
                  <><Bell className="w-3 h-3" /> Notis på</>
                ) : (
                  <><BellOff className="w-3 h-3" /> Notis av</>
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs text-destructive hover:text-destructive gap-1.5"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(product);
                }}
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