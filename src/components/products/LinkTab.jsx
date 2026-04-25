import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search, Plus, Loader2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { lookupProduct } from "@/functions/lookupProduct";

function isShortUrl(input) {
  return /^https?:\/\/(a\.co|amzn\.to|amzn\.eu)\//i.test(input.trim());
}

function extractASIN(input) {
  const trimmed = input.trim();
  const asinRegex = /(?:\/dp\/|\/gp\/product\/|\/ASIN\/)([A-Z0-9]{10})(?:[/?#]|$)/i;
  const match = trimmed.match(asinRegex);
  if (match) return match[1].toUpperCase();
  if (/^[A-Z0-9]{10}$/i.test(trimmed)) return trimmed.toUpperCase();
  return null;
}

export default function LinkTab({ existingAsins = [], onAdd, disabled, isAdding, prefillAsin = "" }) {
  const [url, setUrl] = useState(prefillAsin || "");
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [asin, setAsin] = useState(null);
  const [error, setError] = useState("");

  const lookupMutation = useMutation({
    mutationFn: async (input) => {
      if (isShortUrl(input)) {
        throw new Error("Förkortad länk — öppna produkten i webbläsaren på Amazon.se och kopiera URL:en därifrån.");
      }
      const extractedAsin = extractASIN(input);
      if (!extractedAsin) throw new Error("Kunde inte hitta produkten. Prova att kopiera länken från Amazon.se i webbläsaren istället för appen.\n\nExempel: https://www.amazon.se/dp/B0XXXXXXXXX");

      if (existingAsins.includes(extractedAsin)) throw new Error("Den här produkten bevakas redan.");

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
    },
    onError: (err) => setError(err.message),
  });

  const handleLookup = (e) => {
    e.preventDefault();
    setError("");
    setAsin(null);
    lookupMutation.mutate(url);
  };

  // Auto-lookup on mount if prefilled with an ASIN
  const didAutoLookup = React.useRef(false);
  React.useEffect(() => {
    if (prefillAsin && !didAutoLookup.current) {
      didAutoLookup.current = true;
      lookupMutation.mutate(prefillAsin);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillAsin]);

  const handleAdd = () => {
    onAdd({ asin, title, image_url: imageUrl });
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleLookup} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="url">Produktlänk eller ASIN</Label>
          <div className="flex gap-2">
            <Input
              id="url"
              placeholder="https://www.amazon.se/dp/B0... eller B0XXXXXXXXX"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={disabled}
            />
            <Button
              type="submit"
              disabled={!url.trim() || lookupMutation.isPending || disabled}
              className="shrink-0"
            >
              {lookupMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          💡 Tips: Kopiera länken från Amazon.se i webbläsaren för bästa resultat
        </p>

        {error && (
          <p className="text-sm text-destructive flex items-start gap-1.5 whitespace-pre-line">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            {error}
          </p>
        )}
      </form>

      {asin && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="space-y-4 pt-4 border-t"
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
            onClick={handleAdd}
            disabled={!title.trim() || isAdding || disabled}
          >
            {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {isAdding ? "Lägger till..." : "Lägg till bevakning"}
          </Button>
        </motion.div>
      )}
    </div>
  );
}