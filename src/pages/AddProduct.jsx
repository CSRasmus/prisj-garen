import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import PremiumModal from "@/components/premium/PremiumModal";
import { usePremium } from "@/lib/usePremium";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search, Plus, Loader2, Link2, AlertCircle, CheckCircle2 } from "lucide-react";
import { fetchProductPrice } from "@/functions/fetchProductPrice";
import { lookupProduct } from "@/functions/lookupProduct";
import { motion } from "framer-motion";

function extractASIN(input) {
  const asinRegex = /(?:\/dp\/|\/gp\/product\/|\/ASIN\/)([A-Z0-9]{10})/i;
  const match = input.match(asinRegex);
  if (match) return match[1].toUpperCase();
  if (/^[A-Z0-9]{10}$/i.test(input.trim())) return input.trim().toUpperCase();
  return null;
}

export default function AddProduct() {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [asin, setAsin] = useState(null);
  const [error, setError] = useState("");
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isPremium } = usePremium();

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
    initialData: [],
  });

  const lookupMutation = useMutation({
    mutationFn: async (input) => {
      const extractedAsin = extractASIN(input);
      if (!extractedAsin) throw new Error("Kunde inte hitta ASIN. Klistra in en giltig Amazon-länk.");

      const existing = products.find((p) => p.asin === extractedAsin);
      if (existing) throw new Error("Den här produkten bevakas redan.");

      const result = await lookupProduct({ asin: extractedAsin });
      if (result.data?.error) throw new Error(result.data.error);

      return {
        asin: extractedAsin,
        title: result.data.title,
        image_url: result.data.image_url,
        current_price: result.data.current_price,
      };
    },
    onSuccess: (data) => {
      setAsin(data.asin);
      setTitle(data.title || "");
      setImageUrl(data.image_url || "");
      setError("");
      if (data.current_price) {
        toast({ title: `Pris: ${data.current_price} SEK`, description: data.title });
      }
    },
    onError: (err) => setError(err.message),
  });

  const [fetchingPrice, setFetchingPrice] = useState(false);

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!isPremium && products.length >= 10) throw new Error("Max 10 produkter i bevakningslistan.");
      return base44.entities.Product.create({
        title,
        asin,
        image_url: imageUrl,
        amazon_url: `https://www.amazon.se/dp/${asin}`,
        notify_on_drop: true,
      });
    },
    onSuccess: async (created) => {
      setFetchingPrice(true);
      try {
        await fetchProductPrice({ product_id: created.id, asin: created.asin, title: created.title });
      } catch (_) {
        toast({ title: "Kunde inte hämta pris, försök igen", variant: "destructive" });
      }
      setFetchingPrice(false);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Produkt tillagd!", description: "Priset är nu hämtat och bevakning startar." });
      navigate("/");
    },
    onError: (err) => setError(err.message),
  });

  const handleLookup = (e) => {
    e.preventDefault();
    setError("");
    setAsin(null);
    lookupMutation.mutate(url);
  };

  const atLimit = !isPremium && products.length >= 10;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <PremiumModal open={showPremiumModal} onClose={() => setShowPremiumModal(false)} reason="gränsen på 10 produkter (gratis)" />
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Lägg till produkt</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Klistra in en Amazon-länk eller ASIN-nummer
        </p>
      </motion.div>

      {atLimit && (
        <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-900/10">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm">Du har nått maxgränsen på 10 produkter.</p>
              <button className="text-xs text-amber-600 font-medium hover:underline mt-0.5" onClick={() => setShowPremiumModal(true)}>
                Uppgradera till Premium för obegränsat antal →
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              Amazon-länk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLookup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">Produktlänk eller ASIN</Label>
                <div className="flex gap-2">
                  <Input
                    id="url"
                    placeholder="https://www.amazon.se/dp/B0... eller B0XXXXXXXXX"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={atLimit}
                  />
                  <Button
                    type="submit"
                    disabled={!url.trim() || lookupMutation.isPending || atLimit}
                    className="shrink-0"
                  >
                    {lookupMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {error}
                </p>
              )}
            </form>

            {asin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-6 space-y-4 pt-4 border-t"
              >
                <div className="flex gap-4 items-start">
                  {imageUrl && (
                    <div className="w-20 h-20 rounded-lg bg-muted overflow-hidden shrink-0">
                      <img src={imageUrl} alt="" className="w-full h-full object-contain p-1" />
                    </div>
                  )}
                  <div className="flex-1 space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="title">Produktnamn</Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Produktnamn"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">ASIN: {asin}</p>
                  </div>
                </div>

                <Button
                  className="w-full gap-2"
                  onClick={() => addMutation.mutate()}
                  disabled={!title.trim() || addMutation.isPending || fetchingPrice}
                >
                  {(addMutation.isPending || fetchingPrice) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {fetchingPrice ? "Hämtar nuvarande pris..." : addMutation.isPending ? "Lägger till..." : "Lägg till bevakning"}
                </Button>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}