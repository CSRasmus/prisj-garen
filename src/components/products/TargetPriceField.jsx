import React, { useState } from "react";
import { Lock, Target } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

export default function TargetPriceField({ product, isPremium, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(product.target_price || "");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSave = async () => {
    setSaving(true);
    const parsed = parseFloat(value);
    await base44.entities.Product.update(product.id, { target_price: parsed > 0 ? parsed : null });
    onUpdated?.();
    toast({ title: "Målpris sparat!" });
    setEditing(false);
    setSaving(false);
  };

  if (!isPremium) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-dashed border-border cursor-pointer group"
        onClick={() => navigate("/premium")}>
        <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
          Eget målpris — <span className="text-amber-600 font-medium">Premium-funktion</span>
        </span>
      </div>
    );
  }

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

  if (editing || !product.target_price) {
    return (
      <div className="flex items-center gap-2">
        <Target className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <Input
          type="number"
          placeholder="Målpris (kr)"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-8 text-sm w-32"
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

  return null;
}