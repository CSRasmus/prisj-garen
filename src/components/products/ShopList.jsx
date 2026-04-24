import React, { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ShopList({ shops: shopsJson, lowestShopName }) {
  const [expanded, setExpanded] = useState(false);

  let shops = [];
  try {
    shops = typeof shopsJson === "string" ? JSON.parse(shopsJson) : (Array.isArray(shopsJson) ? shopsJson : []);
  } catch {
    return null;
  }

  if (!shops.length) return null;

  const sorted = [...shops].sort((a, b) => a.price - b.price);
  const lowest = sorted[0];

  return (
    <div className="space-y-2">
      {/* Always-visible lowest price row */}
      <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-accent">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-primary">{lowest.price} kr</span>
          <span className="text-sm text-muted-foreground">på {lowest.shop_name}</span>
          <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">🟢 Lägst!</span>
        </div>
        {lowest.product_url && (
          <a href={lowest.product_url} target="_blank" rel="noopener noreferrer">
            <Button size="sm" className="h-8 gap-1.5 text-xs">
              Köp <ExternalLink className="w-3 h-3" />
            </Button>
          </a>
        )}
      </div>

      {/* Expand toggle */}
      {shops.length > 1 && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? "Dölj" : `Visa alla ${shops.length} butiker`}
          </button>

          {expanded && (
            <div className="space-y-1 mt-1">
              {sorted.map((shop, i) => (
                <div key={i} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm text-muted-foreground truncate">{shop.shop_name}</span>
                    {i === 0 && <span className="text-xs text-primary font-medium">Lägst!</span>}
                    {!shop.in_stock && <span className="text-xs text-destructive">Ej i lager</span>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-sm font-semibold ${i === 0 ? "text-primary" : ""}`}>{shop.price} kr</span>
                    {shop.product_url && (
                      <a href={shop.product_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}