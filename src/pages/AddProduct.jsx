import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Loader2, Link2, AlertCircle, Package, Store } from "lucide-react";
import { searchPrisjakt } from "@/functions/searchPrisjakt";
import { fetchProductPrice } from "@/functions/fetchProductPrice";
import { motion } from "framer-motion";
import { getMaxProducts } from "@/lib/shareUtils";

const SUPPORTED_URLS = [
  "amazon.se", "amazon.com", "komplett.se", "netonnet.se",
  "webhallen.com", "cdon.se", "elgiganten.se", "mediamarkt.se", "prisjakt.nu"
];

function isSupportedUrl(input) {
  return SUPPORTED_URLS.some(d => input.includes(d));
}

const TABS = [
  { id: "search", label: "🔍 Sök produkt" },
  { id: "url", label: "🔗 Klistra in länk" },
];

export default function AddProduct() {
  const [tab, setTab] = useState("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [urlResult, setUrlResult] = useState(null);
  const [lookingUpUrl, setLookingUpUrl] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const [error, setError] = useState("");
  const debounceTimer = useRef(null);

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

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      setSearching(true);
      setError("");
      try {
        const res = await searchPrisjakt({ query: searchQuery, limit: 20, mode: "SEARCH" });
        setSearchResults(res.data?.products || []);
      } catch (e) {
        setError(e.message);
        setSearchResults([]);
      }
      setSearching(false);
    }, 500);
    return () => clearTimeout(debounceTimer.current);
  }, [searchQuery]);

  const handleUrlLookup = async () => {
    setError("");
    setUrlResult(null);
    if (!isSupportedUrl(urlInput.trim())) {
      setError("Länken känns inte igen. Prova med Amazon, Komplett, NetOnNet, Webhallen, CDON, Elgiganten, MediaMarkt eller Prisjakt.");
      return;
    }
    setLookingUpUrl(true);
    try {
      const res = await searchPrisjakt({ url: urlInput.trim(), mode: "URL_LOOKUP" });
      if (res.data?.error) throw new Error(res.data.error);
      setUrlResult(res.data);
    } catch (e) {
      setError(e.message);
    }
    setLookingUpUrl(false);
  };

  const handleAdd = async (productData) => {
    if (atLimit) { toast({ title: `Max ${maxProducts} bevakade produkter`, variant: "destructive" }); return; }
    const pid = productData.prisjakt_id;
    const existing = products.find(p => p.prisjakt_id === pid || (pid && p.asin === pid));
    if (existing) { toast({ title: "Produkten bevakas redan" }); return; }

    setAddingId(pid || productData.title);
    try {
      // Fetch full shop data
      const detailRes = await searchPrisjakt({ prisjakt_id: pid, mode: "PRODUCT_DETAIL" });
      const detail = detailRes.data;
      const shops = detail?.shops || [];
      const lowestShop = shops.reduce((a, b) => (a.price < b.price ? a : b), shops[0] || {});

      const created = await base44.entities.Product.create({
        title: productData.title,
        prisjakt_id: pid,
        prisjakt_url: productData.prisjakt_url || detail?.prisjakt_url,
        image_url: productData.image_url || detail?.image_url,
        notify_on_drop: true,
        current_price: detail?.lowest_price || productData.lowest_price,
        currency: "SEK",
        shops: JSON.stringify(shops),
        lowest_shop_name: lowestShop?.shop_name || null,
        is_multi_shop: shops.length > 1,
        primary_shop: lowestShop?.shop_name || null,
        last_checked: new Date().toISOString(),
      });

      // Fetch and save full price history
      await fetchProductPrice({ product_id: created.id, prisjakt_id: pid, asin: pid }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Produkt tillagd!", description: "Priset bevakas nu." });
      navigate("/dashboard");
    } catch (e) {
      toast({ title: "Kunde inte lägga till produkt", description: e.message, variant: "destructive" });
    }
    setAddingId(null);
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Lägg till produkt</h1>
        <p className="text-muted-foreground text-sm mt-1">Sök efter produkt eller klistra in länk</p>
      </motion.div>

      {atLimit && (
        <Card className="border-border bg-muted/30">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground">Du har nått maxgränsen på {maxProducts} bevakade produkter. Värva fler vänner för att utöka!</p>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setError(""); setSearchResults([]); setUrlResult(null); }}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${tab === t.id ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search tab */}
      {tab === "search" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9 h-12 text-base"
              placeholder="Sök efter produkt (t.ex. Royal Canin, AirPods)"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setError(""); }}
              disabled={atLimit}
              autoFocus
            />
            {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
          </div>

          {error && <p className="text-sm text-destructive flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}</p>}

          <div className="space-y-2">
            {searchResults.map((product) => {
              const isAdded = products.some(p => p.prisjakt_id === product.prisjakt_id);
              const isAdding = addingId === product.prisjakt_id;
              return (
                <Card key={product.prisjakt_id} className="overflow-hidden">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                      {product.image_url
                        ? <img src={product.image_url} alt="" className="w-full h-full object-contain p-1" />
                        : <Package className="w-6 h-6 text-muted-foreground/40" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-2">{product.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        {product.lowest_price && <span className="text-primary font-semibold">från {product.lowest_price} kr</span>}
                        {product.shop_count > 1 && <span className="flex items-center gap-0.5"><Store className="w-3 h-3" />{product.shop_count} butiker</span>}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={isAdded ? "secondary" : "default"}
                      disabled={isAdded || isAdding || atLimit}
                      onClick={() => handleAdd(product)}
                      className="shrink-0 gap-1.5"
                    >
                      {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      {isAdded ? "Bevakad" : isAdding ? "Lägger till..." : "Bevaka"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
            {searchResults.length === 0 && searchQuery.length >= 2 && !searching && !error && (
              <p className="text-center text-muted-foreground text-sm py-6">Inga produkter hittades för "{searchQuery}"</p>
            )}
          </div>
        </motion.div>
      )}

      {/* URL tab */}
      {tab === "url" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                className="h-11"
                placeholder="Klistra in länk från Amazon, Komplett, NetOnNet..."
                value={urlInput}
                onChange={e => { setUrlInput(e.target.value); setError(""); setUrlResult(null); }}
                disabled={atLimit}
              />
              <Button className="shrink-0" onClick={handleUrlLookup} disabled={!urlInput.trim() || lookingUpUrl || atLimit}>
                {lookingUpUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Stödjer: Amazon, Komplett, NetOnNet, Webhallen, CDON, Elgiganten, MediaMarkt, Prisjakt
            </p>
          </div>

          {error && <p className="text-sm text-destructive flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}</p>}

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
                    {urlResult.lowest_price && (
                      <p className="text-primary font-bold mt-1">Från {urlResult.lowest_price} kr</p>
                    )}
                    {urlResult.shops?.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">{urlResult.shops.length} butiker jämförs</p>
                    )}
                  </div>
                </div>
                <Button
                  className="w-full gap-2"
                  onClick={() => handleAdd(urlResult)}
                  disabled={!!addingId}
                >
                  {addingId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {addingId ? "Lägger till..." : "Lägg till bevakning"}
                </Button>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}
    </div>
  );
}