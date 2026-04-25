import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, Plus, Loader2, Package, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { searchAmazon } from "@/functions/searchAmazon";
import { formatPrice } from "@/lib/affiliateUtils";

const SUGGESTIONS = [
  { label: "🐶 Hundmat", query: "hundmat" },
  { label: "🎧 Hörlurar", query: "hörlurar" },
  { label: "🏠 Robotdammsugare", query: "robotdammsugare" },
];

export default function SearchTab({ onSelectProduct, addingAsin, disabled, existingAsins = [] }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef(null);

  const runSearch = async (q) => {
    if (!q || !q.trim()) {
      setResults([]);
      setHasSearched(false);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await searchAmazon({ query: q.trim() });
      const data = res.data;
      if (data?.error) {
        setError(data.error);
        setResults([]);
      } else {
        setResults(data?.results || []);
      }
    } catch (_) {
      setError("Sökningen misslyckades — prova att klistra in en länk istället");
      setResults([]);
    }
    setLoading(false);
    setHasSearched(true);
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setHasSearched(false);
      setError("");
      return;
    }
    debounceRef.current = setTimeout(() => runSearch(query), 500);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const handleSuggestion = (q) => {
    setQuery(q);
    runSearch(q);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Sök på Amazon.se — t.ex. hundmat, AirPods, dammsugare..."
          className="h-12 pl-11 text-base"
          disabled={disabled}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {!hasSearched && !query.trim() && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Populära sökningar:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <Button
                key={s.query}
                variant="outline"
                size="sm"
                onClick={() => handleSuggestion(s.query)}
                disabled={disabled}
                className="h-9"
              >
                {s.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          {error}
        </p>
      )}

      {hasSearched && !loading && results.length === 0 && !error && (
        <Card className="p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Inga produkter hittades för "{query}" — prova ett annat sökord
          </p>
        </Card>
      )}

      <div className="space-y-2">
        {results.map((product, i) => {
          const alreadyTracked = existingAsins.includes(product.asin);
          const isAdding = addingAsin === product.asin;
          return (
            <motion.div
              key={product.asin}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card className="p-3 flex gap-3 items-center hover:shadow-md transition-shadow">
                <div className="w-[60px] h-[60px] rounded-md bg-muted shrink-0 flex items-center justify-center overflow-hidden">
                  {product.image_url ? (
                    <img src={product.image_url} alt="" className="w-full h-full object-contain p-1" />
                  ) : (
                    <Package className="w-6 h-6 text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight line-clamp-2">{product.title}</p>
                  {product.price ? (
                    <p className="text-sm font-bold text-primary mt-1">{formatPrice(product.price, product.currency)}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">Pris ej tillgängligt</p>
                  )}
                </div>
                <Button
                  size="sm"
                  className="shrink-0 h-10 gap-1.5"
                  disabled={disabled || isAdding || alreadyTracked}
                  onClick={() => onSelectProduct(product)}
                >
                  {isAdding ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : alreadyTracked ? (
                    "Bevakas"
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Bevaka
                    </>
                  )}
                </Button>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}