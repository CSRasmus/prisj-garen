import React from "react";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

export default function PriceBadge({ status }) {
  const config = {
    low: {
      label: "Lågt pris",
      icon: TrendingDown,
      className: "bg-primary/15 text-primary border-primary/25 hover:bg-primary/20",
    },
    high: {
      label: "Högt pris",
      icon: TrendingUp,
      className: "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/15",
    },
    normal: {
      label: "Normalt",
      icon: Minus,
      className: "bg-secondary text-secondary-foreground border-border hover:bg-secondary/80",
    },
    stable: {
      label: "Stabilt",
      icon: Minus,
      className: "bg-secondary text-secondary-foreground border-border hover:bg-secondary/80",
    },
    unknown: {
      label: "Okänt",
      icon: Minus,
      className: "bg-muted text-muted-foreground border-border hover:bg-muted/80",
    },
  };

  const { label, icon: Icon, className } = config[status] || config.unknown;

  return (
    <Badge variant="outline" className={`gap-1 font-medium ${className}`}>
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
}