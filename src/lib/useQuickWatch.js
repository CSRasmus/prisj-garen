import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { buildAmazonUrl } from "@/lib/affiliateUtils";
import { fetchProductPrice } from "@/functions/fetchProductPrice";
import { fetchProductHistory } from "@/functions/fetchProductHistory";
import { getMaxProducts } from "@/lib/shareUtils";

/**
 * One-click "Bevaka prisfall" — creates a Product, seeds price history,
 * and routes the user to login if needed. Returns { watch, watchingAsin }.
 */
export function useQuickWatch() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [watchingAsin, setWatchingAsin] = useState(null);

  const watch = async ({ asin, title, image_url }) => {
    if (!asin || !title) return;

    // Auth check — redirect to login, then back to /deals
    const authed = await base44.auth.isAuthenticated().catch(() => false);
    if (!authed) {
      base44.auth.redirectToLogin(window.location.href);
      return;
    }

    setWatchingAsin(asin);
    try {
      const me = await base44.auth.me();
      const myProducts = await base44.entities.Product.filter({ created_by: me.email });

      // Already watching?
      if (myProducts.some((p) => p.asin === asin)) {
        toast({ title: "Du bevakar redan den här produkten" });
        navigate("/dashboard");
        return;
      }

      // Limit check
      const maxProducts = getMaxProducts(me.referred_count);
      if (myProducts.length >= maxProducts) {
        toast({
          title: `Max ${maxProducts} produkter`,
          description: "Värva fler vänner för att utöka.",
          variant: "destructive",
        });
        navigate("/add");
        return;
      }

      // Create product
      const created = await base44.entities.Product.create({
        title,
        asin,
        image_url,
        amazon_url: buildAmazonUrl(asin),
        notify_on_drop: true,
      });

      // Seed history (same flow as AddProduct)
      const historicalRows = await base44.entities.GlobalPriceHistory.filter(
        { asin, source: "easyparser_historical" }, "-checked_at", 1
      );
      if (historicalRows.length === 0) {
        try { await fetchProductHistory({ asin }); } catch (_) { /* ignore */ }
      }
      const globalHistory = await base44.entities.GlobalPriceHistory.filter(
        { asin }, "-checked_at", 500
      );
      if (globalHistory.length > 0) {
        for (const point of globalHistory) {
          await base44.entities.PriceHistory.create({
            product_id: created.id,
            price: point.price,
            currency: point.currency || "SEK",
            checked_at: point.checked_at,
          });
        }
        await base44.entities.Product.update(created.id, {
          current_price: globalHistory[0]?.price,
          currency: "SEK",
          last_checked: globalHistory[0]?.checked_at,
        });
      } else {
        await fetchProductPrice({ product_id: created.id, asin, title });
      }

      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: `✅ ${title.slice(0, 40)}${title.length > 40 ? "…" : ""} bevakas!` });
      navigate("/dashboard");
    } catch (err) {
      toast({ title: "Något gick fel", description: err.message, variant: "destructive" });
    } finally {
      setWatchingAsin(null);
    }
  };

  return { watch, watchingAsin };
}