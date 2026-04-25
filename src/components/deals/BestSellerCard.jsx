import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Bell } from "lucide-react";
import { motion } from "framer-motion";
import { formatPrice } from "@/lib/affiliateUtils";

export default function BestSellerCard({ product, index = 0 }) {
  const watchHref = product.asin
    ? `/add?asin=${encodeURIComponent(product.asin)}`
    : "/add";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.04 }}
    >
      <Card className="overflow-hidden hover:shadow-md transition-shadow h-full">
        <CardContent className="p-4 flex flex-col h-full">
          <div className="aspect-square w-full rounded-lg bg-muted overflow-hidden mb-3">
            {product.image_url && (
              <img
                src={product.image_url}
                alt={product.title}
                className="w-full h-full object-contain p-2"
                loading="lazy"
              />
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <span>{product.category_emoji}</span>
            <span>{product.category}</span>
          </div>
          <h3 className="font-semibold text-sm text-foreground line-clamp-2 leading-snug mb-2">
            {product.title}
          </h3>
          <div className="mt-auto space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-extrabold text-primary">
                {formatPrice(product.current_price)}
              </span>
              <span className="inline-block bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                🏆 Bästsäljare
              </span>
            </div>
            <a
              href={product.amazon_url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="block"
            >
              <Button size="sm" className="w-full gap-1.5">
                Köp på Amazon <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </a>
            <Link to={watchHref} className="block">
              <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs">
                <Bell className="w-3 h-3" /> Bevaka prisfall
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}