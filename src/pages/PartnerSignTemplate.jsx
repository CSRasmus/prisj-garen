import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Printer, ArrowLeft } from "lucide-react";

const typeAnimal = {
  djurfrisor: "husdjur",
  uppfodare: "ditt husdjur",
  kurshallare: "ditt husdjur",
  simhall: "dina inköp",
  annat: "dina inköp",
};

export default function PartnerSignTemplate() {
  const { slug } = useParams();
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);
  const url = `https://prisfall.se/p/${slug}`;

  useEffect(() => {
    async function load() {
      try {
        const results = await base44.entities.Partner.filter({ slug });
        setPartner(results?.[0] || null);
      } catch (_) {}
      setLoading(false);
    }
    load();
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!partner) return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Partner hittades inte</p>
    </div>
  );

  const animal = typeAnimal[partner.type] || "dina inköp";

  return (
    <div className="min-h-screen bg-background font-inter">
      {/* Screen controls — hidden on print */}
      <div className="no-print max-w-lg mx-auto px-4 py-6 flex items-center justify-between">
        <Link to="/admin/partners">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Tillbaka
          </Button>
        </Link>
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="w-4 h-4" /> Skriv ut skylt
        </Button>
      </div>

      {/* A5 Sign — centered on screen, full page on print */}
      <div className="flex items-center justify-center px-4 pb-12 print:p-0 print:block">
        <div
          id="sign"
          style={{ width: "148mm", minHeight: "210mm" }}
          className="bg-white border-2 border-gray-200 rounded-2xl p-8 flex flex-col items-center text-center gap-6 shadow-lg print:shadow-none print:border-none print:rounded-none print:w-full print:min-h-screen"
        >
          {/* Header */}
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center">
            <span className="text-2xl text-white font-extrabold">P</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">
              Spara pengar på {animal}!
            </h1>
            <p className="text-sm text-gray-500">via Amazon.se</p>
          </div>

          <div className="bg-gray-50 rounded-xl px-5 py-4 space-y-2 w-full">
            <p className="text-sm text-gray-700 font-medium">Hur fungerar det?</p>
            <div className="text-xs text-gray-600 space-y-1.5 text-left">
              <p>1️⃣ Skanna QR-koden och skapa ett gratis konto</p>
              <p>2️⃣ Lägg in produkter du vill köpa</p>
              <p>3️⃣ Få ett mail när priset sjunker</p>
            </div>
          </div>

          {/* QR */}
          <div className="space-y-3">
            <div className="p-3 bg-white border-2 border-gray-100 rounded-2xl inline-block">
              <QRCodeSVG value={url} size={160} />
            </div>
            <p className="text-xs text-gray-400 font-mono">{url}</p>
          </div>

          <div className="space-y-1">
            <p className="text-lg font-extrabold text-gray-900">Skanna för att börja spara!</p>
            <p className="text-xs text-gray-400">Gratis · Inga kortuppgifter</p>
          </div>

          {/* Partner credit */}
          <div className="mt-auto pt-4 border-t border-gray-100 w-full">
            <p className="text-xs text-gray-400">
              I samarbete med <strong className="text-gray-600">{partner.name}</strong>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; }
          #sign {
            width: 148mm !important;
            min-height: 210mm !important;
            margin: 0 auto;
            page-break-after: avoid;
          }
        }
      `}</style>
    </div>
  );
}