import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function PartnerLanding() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    base44.entities.Partner.filter({ slug })
      .then((results) => {
        if (!results.length) { setNotFound(true); setLoading(false); return; }
        const p = results[0];
        setPartner(p);
        // Store partner attribution in localStorage
        localStorage.setItem("prisfall_partner_id", p.id);
        localStorage.setItem("prisfall_partner_slug", p.slug);
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [slug]);

  const handleCTA = async () => {
    const isAuth = await base44.auth.isAuthenticated();
    if (isAuth) {
      navigate("/dashboard");
    } else {
      base44.auth.redirectToLogin("/dashboard");
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Hittades inte</h1>
          <p className="text-muted-foreground mb-4">Den här partnersidan finns inte.</p>
          <Button onClick={() => navigate("/")}>Gå till startsidan</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-5xl">🐾</div>
        <div>
          <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">
            Samarbete med
          </p>
          <h1 className="text-3xl font-bold">{partner.name}</h1>
          {partner.city && (
            <p className="text-muted-foreground mt-1">{partner.city}</p>
          )}
        </div>

        <Card className="p-6 text-left space-y-3">
          <h2 className="text-lg font-semibold">Spara pengar på Amazon — automatiskt</h2>
          <p className="text-sm text-muted-foreground">
            Prisfall bevakar dina Amazon-produkter och meddelar dig när priset sjunker.
            Kom igång gratis och börja spara direkt!
          </p>
          <ul className="text-sm space-y-1.5 text-muted-foreground">
            <li>✅ Gratis att använda</li>
            <li>✅ E-postnotis vid prisfall</li>
            <li>✅ Bevakar automatiskt dygnet runt</li>
          </ul>
        </Card>

        <Button size="lg" className="w-full text-base h-12" onClick={handleCTA}>
          Kom igång gratis →
        </Button>

        <p className="text-xs text-muted-foreground">
          Rekommenderas av {partner.name}
        </p>
      </div>
    </div>
  );
}