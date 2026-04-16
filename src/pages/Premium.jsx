import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Crown, Check, Zap, Bell, Target, Clock, Users, Shield, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePremium } from "@/lib/usePremium";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

const FREE_FEATURES = [
  "Max 10 produkter",
  "Prisuppdatering 1 gång/dag",
  "E-postnotiser",
  "90 dagars prishistorik",
];

const PREMIUM_FEATURES = [
  { icon: Zap, text: "Obegränsat antal produkter" },
  { icon: Clock, text: "Prisuppdatering var 6:e timme" },
  { icon: Bell, text: "SMS + e-post + push-notiser" },
  { icon: Target, text: "Eget målpris per produkt" },
  { icon: Shield, text: "365 dagars prishistorik" },
  { icon: Users, text: "Dela watchlist med familj/vänner" },
];

export default function Premium() {
  const { user, isPremium } = usePremium();
  const { toast } = useToast();
  const [activating, setActivating] = React.useState(false);

  const handleActivate = async () => {
    setActivating(true);
    try {
      await base44.auth.updateMe({
        is_premium: true,
        premium_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
      toast({ title: "🎉 Premium aktiverat! 7 dagars gratis provperiod startad." });
      setTimeout(() => window.location.reload(), 1200);
    } catch {
      toast({ title: "Något gick fel, försök igen", variant: "destructive" });
    }
    setActivating(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" />
          Tillbaka
        </Link>
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Crown className="w-6 h-6 text-amber-500" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">PrisKoll Premium</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Uppgradera för att spara mer och missa aldrig ett bra pris.
          </p>
          {isPremium && (
            <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1.5">
              <Crown className="w-3.5 h-3.5" /> Du är redan Premium!
            </Badge>
          )}
        </div>
      </motion.div>

      {/* Pricing cards */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid sm:grid-cols-2 gap-4">
        {/* Monthly */}
        <Card className="border-border/60">
          <CardContent className="p-6 space-y-4">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Månadsvis</p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-4xl font-extrabold">29</span>
                <span className="text-muted-foreground">kr/mån</span>
              </div>
            </div>
            <Button className="w-full" onClick={handleActivate} disabled={isPremium || activating}>
              {activating ? "Aktiverar..." : isPremium ? "Redan aktiv" : "Starta 7 dagars gratis"}
            </Button>
          </CardContent>
        </Card>
        {/* Yearly */}
        <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-900/10 relative overflow-hidden">
          <div className="absolute top-3 right-3">
            <Badge className="bg-amber-500 text-white text-xs">Spara 20%</Badge>
          </div>
          <CardContent className="p-6 space-y-4">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Årsvis</p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-4xl font-extrabold">249</span>
                <span className="text-muted-foreground">kr/år</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">= 20,75 kr/mån</p>
            </div>
            <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white" onClick={handleActivate} disabled={isPremium || activating}>
              {activating ? "Aktiverar..." : isPremium ? "Redan aktiv" : "Starta 7 dagars gratis"}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Comparison table */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="col-span-1" />
              <div className="text-center text-sm font-semibold text-muted-foreground">Gratis</div>
              <div className="text-center text-sm font-semibold text-amber-600 flex items-center justify-center gap-1">
                <Crown className="w-3.5 h-3.5" /> Premium
              </div>
            </div>
            {[
              ["Antal produkter", "Max 10", "Obegränsat"],
              ["Prisuppdatering", "1 gång/dag", "Var 6:e timme"],
              ["E-postnotiser", true, true],
              ["SMS-notiser", false, true],
              ["Eget målpris", false, true],
              ["Prishistorik", "90 dagar", "365 dagar"],
              ["Dela watchlist", false, true],
            ].map(([label, free, premium], i) => (
              <div key={i} className={`grid grid-cols-3 gap-4 py-3 ${i > 0 ? "border-t" : ""}`}>
                <div className="text-sm">{label}</div>
                <div className="flex justify-center">
                  {typeof free === "boolean"
                    ? free ? <Check className="w-4 h-4 text-primary" /> : <span className="w-4 h-4 text-muted-foreground/30 text-lg leading-none">—</span>
                    : <span className="text-xs text-muted-foreground">{free}</span>}
                </div>
                <div className="flex justify-center">
                  {typeof premium === "boolean"
                    ? premium ? <Check className="w-4 h-4 text-amber-500" /> : <span className="w-4 h-4 text-muted-foreground/30 text-lg leading-none">—</span>
                    : <span className="text-xs font-medium text-amber-600">{premium}</span>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Feature highlights */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="grid sm:grid-cols-2 gap-3">
        {PREMIUM_FEATURES.map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-amber-500" />
            </div>
            <span className="text-sm font-medium">{text}</span>
          </div>
        ))}
      </motion.div>

      <p className="text-center text-xs text-muted-foreground pb-4">
        7 dagars gratis provperiod · Avsluta när som helst · Inga dolda avgifter
      </p>
    </div>
  );
}