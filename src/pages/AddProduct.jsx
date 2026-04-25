import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search, Link2, AlertCircle } from "lucide-react";
import { fetchProductPrice } from "@/functions/fetchProductPrice";
import { fetchProductHistory } from "@/functions/fetchProductHistory";
import { motion } from "framer-motion";
import { getMaxProducts } from "@/lib/shareUtils";
import { buildAmazonUrl } from "@/lib/affiliateUtils";
import SearchTab from "@/components/products/SearchTab";
import LinkTab from "@/components/products/LinkTab";

export default function AddProduct() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addingAsin, setAddingAsin] = useState(null);

  const [currentUser, setCurrentUser] = React.useState(null);
  React.useEffect(() => {
    document.title = "Lägg till produkt — Prisfall";
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.filter({ created_by: currentUser.email }),
    enabled: !!currentUser?.email,
    initialData: [],
  });

  const maxProducts = getMaxProducts(currentUser?.referred_count);
  const atLimit = products.length >= maxProducts;
  const existingAsins = products.map((p) => p.asin).filter(Boolean);

  // Shared add flow: create Product, seed history, redirect
  const addMutation = useMutation({
    mutationFn: async ({ asin, title, image_url }) => {
      if (atLimit) throw new Error(`Max ${maxProducts} produkter i bevakningslistan.`);
      if (existingAsins.includes(asin)) throw new Error("Den här produkten bevakas redan.");
      return base44.entities.Product.create({
        title,
        asin,
        image_url,
        amazon_url: buildAmazonUrl(asin),
        notify_on_drop: true,
      });
    },
    onSuccess: async (created) => {
      try {
        // 1. Check if we already have HISTORICAL data (not just live scrapes) for this ASIN
        const historicalRows = await base44.entities.GlobalPriceHistory.filter(
          { asin: created.asin, source: "easyparser_historical" }, "-checked_at", 1
        );

        // 2. If no historical data yet, fetch 12-month history from Easyparser
        if (historicalRows.length === 0) {
          try {
            await fetchProductHistory({ asin: created.asin });
          } catch (_) {
            // continue with whatever we have
          }
        }

        // 3. Now fetch all global history (live + historical) to seed PriceHistory
        const globalHistory = await base44.entities.GlobalPriceHistory.filter(
          { asin: created.asin }, "-checked_at", 500
        );

        // 3. Seed PriceHistory from GlobalPriceHistory
        if (globalHistory.length > 0) {
          for (const point of globalHistory) {
            await base44.entities.PriceHistory.create({
              product_id: created.id,
              price: point.price,
              currency: point.currency || "SEK",
              checked_at: point.checked_at,
            });
          }
          const latestPrice = globalHistory[0]?.price;
          await base44.entities.Product.update(created.id, {
            current_price: latestPrice,
            currency: "SEK",
            last_checked: globalHistory[0]?.checked_at,
          });
        } else {
          // Last resort: live price scrape
          await fetchProductPrice({ product_id: created.id, asin: created.asin, title: created.title });
        }
      } catch (_) {
        toast({ title: "Kunde inte hämta pris, försök igen", variant: "destructive" });
      }

      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({
        title: `✅ ${created.title} tillagd!`,
        description: "Prishistorik hämtad",
      });

      setTimeout(() => navigate("/dashboard"), 1500);
    },
    onError: (err) => {
      toast({ title: err.message, variant: "destructive" });
      setAddingAsin(null);
    },
    onSettled: () => {
      // Keep addingAsin set until navigation; reset only on error (handled above)
    },
  });

  const handleAdd = ({ asin, title, image_url }) => {
    if (!asin || !title) return;
    setAddingAsin(asin);
    addMutation.mutate({ asin, title, image_url });
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Lägg till produkt</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Sök direkt på Amazon.se eller klistra in en länk
        </p>
      </motion.div>

      {atLimit && (
        <Card className="border-border bg-muted/30">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground">
              Du har nått maxgränsen på {maxProducts} bevakade produkter. Värva fler vänner för att utöka!
            </p>
          </CardContent>
        </Card>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-11">
            <TabsTrigger value="search" className="gap-1.5">
              <Search className="w-4 h-4" />
              Sök produkt
            </TabsTrigger>
            <TabsTrigger value="link" className="gap-1.5">
              <Link2 className="w-4 h-4" />
              Klistra in länk
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="mt-4">
            <Card>
              <CardContent className="p-4 sm:p-6">
                <SearchTab
                  onSelectProduct={handleAdd}
                  addingAsin={addingAsin}
                  disabled={atLimit || addMutation.isPending}
                  existingAsins={existingAsins}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="link" className="mt-4">
            <Card>
              <CardContent className="p-4 sm:p-6">
                <LinkTab
                  existingAsins={existingAsins}
                  onAdd={handleAdd}
                  disabled={atLimit}
                  isAdding={addMutation.isPending}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}