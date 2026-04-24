import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Link2, AlertCircle, Package, Info } from "lucide-react";
import { lookupProduct } from "@/functions/lookupProduct";
import { fetchProductPrice } from "@/functions/fetchProductPrice";
import { motion } from "framer-motion";
import { getMaxProducts } from "@/lib/shareUtils";

// Extract ASIN from common Amazon.se URL formats
function extractAsin(input) {
  if (!input) return null;
  const trimmed = input.trim();
  // Plain ASIN
  if (/^[A-Z0-9]{10}$/i.test(trimmed)) return trimmed.toUpperCase();
  // amazon.se/dp/ASIN or /gp/product/ASIN or /PRODUKTNAMN/dp/ASIN
  const m = trimmed.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
  if (m) return m[1].toUpperCase();
  return null;
}

function isShortUrl(input) {
  return /a\.co\/d\/|amzn\.to\//i.test(input);
}

export default function AddProduct() {
  const [urlInput, setUrlInput] = useState("");
  const [urlResult, setUrlResult] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [shortUrlHint, setShortUrlHint] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => {
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

  const handleLookup = async () => {
    setError("");
    setUrlResult(null);
    setShortUrlHint(false);

    const input = urlInput.trim();
    if (isShortUrl(input)) {
      setShortUrlHint(true);
      setError("Kortlänkar (a.co/d/ eller amzn.to/) går inte att läsa. Öppna länken i webbläsaren och kopiera den fullständiga amazon.se-länken.");
      return;
    }

    const asin = extractAsin(input);
    if (!asin) {
      setError("Kunde inte hitta produkt-ID i länken. Kopiera länken från Amazon.se i webbläsaren.");
      return;
    }

    // Check if already watched
    if (products.some(p => p.asin === asin)) {
      setError("Du bevakar redan denna produkt.");
      return;
    }

    setLookingUp(true);
    try {
      const res = await lookupProduct({ asin });
      setUrlResult({ ...res.data, asin });
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Kunde inte hämta produkten");
    }
    setLookingUp(false);
  };

  const handleAdd = async () => {
    if (atLimit || !urlResult?.asin) return;
    setAdding(true);
    try {
      const created = await base44.entities.Product.create({
        title: urlResult.title,
        asin: urlResult.asin,
        image_url: urlResult.image_url,
        current_price: urlResult.current_price,
        currency: "SEK",
        notify_on_drop: true,
        last_checked: new Date().toISOString(),
      });
      await fetchProductPrice({ product_id: created.id, asin: urlResult.asin }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Produkt tillagd!", description: "Priset bevakas nu." });
      navigate("/dashboard");
    } catch (e) {
      toast({ title: "Kunde inte lägga till produkt", description: e.message, variant: "destructive" });
    }
    setAdding(false);
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Lägg till produkt</h1>
        <p className="text-muted-foreground text-sm mt-1">Klistra in en länk från Amazon.se</p>
      </motion.div>

      {atLimit && (
        <Card className="border-border bg-muted/30">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground">Du har nått maxgränsen på {maxProducts} bevakade produkter. Värva fler vänner för att utöka!</p>
          </CardContent>
        </Card>
      )}

      <div className="flex items-start gap-2 p-3 rounded-lg bg-accent/50 border border-accent">
        <Info className="w-4 h-4 text-accent-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-accent-foreground">
          <strong>Tips:</strong> Kopiera länken från Amazon.se i webbläsaren för bästa resultat. Stödjer formaten <code className="bg-background/50 px-1 rounded">amazon.se/dp/...</code>, <code className="bg-background/50 px-1 rounded">/gp/product/...</code> eller bara ASIN-koden.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            className="h-11"
            placeholder="https://www.amazon.se/dp/B0..."
            value={urlInput}
            onChange={e => { setUrlInput(e.target.value); setError(""); setUrlResult(null); setShortUrlHint(false); }}
            disabled={atLimit}
            autoFocus
          />
          <Button className="shrink-0" onClick={handleLookup} disabled={!urlInput.trim() || lookingUp || atLimit}>
            {lookingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
          </Button>
        </div>

        {shortUrlHint && (
          <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-xs text-yellow-800">
            💡 <strong>Så här gör du:</strong> Öppna kortlänken i Amazons app eller webbläsare, tryck "Dela" → "Kopiera länk" igen när produktsidan är öppen. Då får du en fullständig <code className="bg-white/60 px-1 rounded">amazon.se/dp/...</code>-länk.
          </div>
        )}

        {error && !shortUrlHint && (
          <p className="text-sm text-destructive flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
          </p>
        )}

        {urlResult && (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                  {urlResult.image_url
                    ? <img src={urlResult.image_url} alt="" className="w-full h-full object-contain p-1" />
                    : <Package className="w-7 h-7 text-muted-foreground/40" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm line-clamp-2">{urlResult.title}</p>
                  {urlResult.current_price && (
                    <p className="text-primary font-bold mt-1">{urlResult.current_price} kr</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">ASIN: {urlResult.asin}</p>
                </div>
              </div>
              <Button
                className="w-full gap-2"
                onClick={handleAdd}
                disabled={adding || atLimit}
              >
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {adding ? "Lägger till..." : "Lägg till bevakning"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}