import React, { useState } from "react";
import { Target } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

export default function TargetPriceField({ product, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(product.target_price || "");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setSaving(true);
    const parsed = parseFloat(value);
    await base44.entities.Product.update(product.id, { target_price: parsed > 0 ? parsed : null });
    onUpdated?.();
    toast({ title: "Målpris sparat!" });
    setEditing(false);
    setSaving(false);
  };

  if (product.target_price && !editing) {
    return (
      <div className="flex items-center gap-2">
        <Badge className="bg-primary/10 text-primary border-primary/20 gap-1.5 cursor-pointer hover:bg-primary/20"
          onClick={() => setEditing(true)}>
          <Target className="w-3 h-3" />
          Målpris: {product.target_price} kr
        </Badge>
        <button className="text-xs text-muted-foreground hover:text-destructive transition-colors"
          onClick={async () => {
            await base44.entities.Product.update(product.id, { target_price: null });
            onUpdated?.();
          }}>
          Ta bort
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Target className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <Input
        type="number"
        placeholder="Sätt målpris (kr)"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-8 text-sm w-36"
        autoFocus={editing}
        onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
      />
      <Button size="sm" className="h-8 text-xs" onClick={handleSave} disabled={saving || !value}>
        {saving ? "..." : "Spara"}
      </Button>
      {editing && (
        <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setEditing(false)}>
          Avbryt
        </button>
      )}
    </div>
  );
}