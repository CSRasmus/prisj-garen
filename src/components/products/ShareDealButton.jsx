import React from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { shareDeal } from "@/lib/shareUtils";

export default function ShareDealButton({ product, className = "" }) {
  const { toast } = useToast();

  if (!product.is_low_price) return null;

  return (
    <Button
      variant="ghost"
      className={`h-10 text-xs gap-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 px-3 ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        shareDeal(product, toast);
      }}
    >
      <Share2 className="w-3 h-3" />
      Dela deal
    </Button>
  );
}