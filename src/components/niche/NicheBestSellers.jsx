import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import BestSellerCard from "@/components/deals/BestSellerCard";

export default function NicheBestSellers({ category, title = "Populära just nu", limit = 6 }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const list = await base44.entities.BestSellerProduct.filter(
          { category, active: true }, "current_rank", limit
        );
        if (!cancelled) setProducts(list || []);
      } catch (_) {
        if (!cancelled) setProducts([]);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [category, limit]);

  if (!loading && products.length === 0) return null;

  return (
    <section className="py-16 px-4 bg-muted/30">
      <div className="max-w-5xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="text-2xl sm:text-3xl font-extrabold">{title}</h2>
          <p className="text-muted-foreground mt-2">
            Bästsäljare på Amazon.se inom {category.toLowerCase()}
          </p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {loading
            ? Array.from({ length: limit }).map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
                  <div className="aspect-square bg-muted rounded-lg mb-3" />
                  <div className="h-3 bg-muted rounded mb-2 w-1/2" />
                  <div className="h-4 bg-muted rounded mb-2" />
                  <div className="h-8 bg-muted rounded" />
                </div>
              ))
            : products.map((p, i) => (
                <BestSellerCard
                  key={p.id}
                  product={{
                    asin: p.asin,
                    title: p.title,
                    image_url: p.image_url,
                    current_price: p.current_price,
                    category: p.category,
                    category_emoji: p.category_emoji,
                    amazon_url: `https://www.amazon.se/dp/${p.asin}?tag=priskoll-21`,
                  }}
                  index={i}
                />
              ))}
        </div>
      </div>
    </section>
  );
}