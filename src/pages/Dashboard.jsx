import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import ProductCard from "@/components/products/ProductCard";
import EmptyWatchlist from "@/components/products/EmptyWatchlist";
import StatsWidget from "@/components/products/StatsWidget";
import DealsSection from "@/components/products/DealsSection";
import PriceCelebration from "@/components/products/PriceCelebration";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Plus, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReferralCard from "@/components/referral/ReferralCard";
import { getMaxProducts } from "@/lib/shareUtils";

export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCelebration, setShowCelebration] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list("-created_date"),
  });

  const deleteMutation = useMutation({
    mutationFn: (product) => base44.entities.Product.delete(product.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Produkt borttagen", description: "Produkten har tagits bort från din bevakningslista." });
    },
  });

  const toggleNotifyMutation = useMutation({
    mutationFn: (product) =>
      base44.entities.Product.update(product.id, { notify_on_drop: !product.notify_on_drop }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-8 w-48" />
        {Array(3).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return <EmptyWatchlist />;
  }

  const lowPriceCount = products.filter((p) => p.is_low_price).length;
  const maxProducts = getMaxProducts(currentUser?.referred_count);

  return (
    <div className="space-y-6">
      <PriceCelebration show={showCelebration} onDone={() => setShowCelebration(false)} />

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Mina bevakningar</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <p className="text-muted-foreground text-sm">
              {products.length} produkt{products.length !== 1 && "er"} bevakade
            </p>
            {lowPriceCount > 0 && (
              <span className="inline-flex items-center gap-1 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                <Tag className="w-3 h-3" />
                {lowPriceCount} lågt pris
              </span>
            )}
          </div>
        </div>
        {products.length < maxProducts && (
          <Link to="/add">
            <Button size="sm" variant="outline" className="gap-1.5 shrink-0">
              <Plus className="w-4 h-4" />
              Lägg till
            </Button>
          </Link>
        )}
      </motion.div>

      <StatsWidget products={products} />

      <DealsSection products={products} />

      <ReferralCard user={currentUser} />

      <div className="space-y-3">
        {products.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            index={index}
            onDelete={(p) => deleteMutation.mutate(p)}
            onToggleNotify={(p) => toggleNotifyMutation.mutate(p)}
            onPriceDrop={() => setShowCelebration(true)}
          />
        ))}
      </div>
    </div>
  );
}