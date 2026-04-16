import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import ProductCard from "@/components/products/ProductCard";
import EmptyWatchlist from "@/components/products/EmptyWatchlist";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Eye } from "lucide-react";

export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list("-created_date"),
    initialData: [],
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

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Mina bevakningar</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {products.length} produkt{products.length !== 1 && "er"} bevakade
            {lowPriceCount > 0 && (
              <span className="text-primary font-medium">
                {" "}· {lowPriceCount} med lågt pris
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Eye className="w-4 h-4" />
          <span className="text-sm font-medium">{products.length}/10</span>
        </div>
      </motion.div>

      <div className="space-y-3">
        {products.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            index={index}
            onDelete={(p) => deleteMutation.mutate(p)}
            onToggleNotify={(p) => toggleNotifyMutation.mutate(p)}
          />
        ))}
      </div>
    </div>
  );
}