import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Copy, Users, Gift } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { buildReferralUrl, shareReferral, getMaxProducts, getNextMilestone } from "@/lib/shareUtils";
import { motion } from "framer-motion";

export default function ReferralCard({ user }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  if (!user) return null;

  const referralCode = user.referral_code || user.id?.substring(0, 8);
  const referralUrl = buildReferralUrl(referralCode);
  const referredCount = user.referred_count || 0;
  const maxProducts = getMaxProducts(referredCount);
  const nextMilestone = getNextMilestone(referredCount);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    toast({ title: "✅ Länken kopierad!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => shareReferral(referralCode, toast);

  const tiers = [
    { need: 1, slots: 12, label: "+2 bevakningar" },
    { need: 3, slots: 15, label: "+5 bevakningar" },
    { need: 5, slots: 20, label: "+10 bevakningar" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Bjud in vänner — få fler bevakningar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current status */}
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">Du bevakar nu upp till</span>
            <span className="font-bold text-primary text-base">{maxProducts} produkter</span>
          </div>

          {/* Progress tiers */}
          <div className="grid grid-cols-3 gap-2">
            {tiers.map((tier) => {
              const reached = referredCount >= tier.need;
              return (
                <div
                  key={tier.need}
                  className={`rounded-xl p-2.5 text-center border text-xs transition-all ${
                    reached
                      ? "bg-primary/10 border-primary/30 text-primary font-semibold"
                      : "bg-muted/40 border-border text-muted-foreground"
                  }`}
                >
                  <div className="font-bold text-sm">{tier.need} vän{tier.need > 1 ? "ner" : ""}</div>
                  <div>{tier.label}</div>
                  {reached && <div className="text-[10px] mt-0.5">✓ Upplåst</div>}
                </div>
              );
            })}
          </div>

          {/* Next milestone */}
          {nextMilestone && (
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              <Gift className="w-3 h-3 inline mr-1 text-primary" />
              Värva <strong>{nextMilestone.need - referredCount} till</strong> för att låsa upp <strong>{nextMilestone.bonus} bevakningar</strong>
            </p>
          )}

          {/* Referral link */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Din unika länk</p>
            <div className="flex gap-2">
              <div className="flex-1 bg-muted rounded-lg px-3 py-2 text-xs text-muted-foreground truncate font-mono">
                {referralUrl}
              </div>
              <Button variant="outline" size="sm" className="h-9 px-3 shrink-0" onClick={handleCopy}>
                <Copy className="w-3.5 h-3.5 mr-1" />
                {copied ? "Kopierat!" : "Kopiera"}
              </Button>
            </div>
            <Button onClick={handleShare} className="w-full h-10 gap-2 text-sm">
              <Share2 className="w-4 h-4" />
              Dela med vänner
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground text-center">
            {referredCount} vän{referredCount !== 1 ? "ner" : ""} värvad{referredCount !== 1 ? "e" : ""}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}