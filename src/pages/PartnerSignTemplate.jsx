import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { QRCodeSVG } from "qrcode.react";

export default function PartnerSignTemplate() {
  const { slug } = useParams();
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);
  const partnerUrl = `${window.location.origin}/p/${slug}`;

  useEffect(() => {
    base44.entities.Partner.filter({ slug })
      .then((results) => {
        setPartner(results[0] || null);
        setLoading(false);
        setTimeout(() => window.print(), 800);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!partner) return <p className="text-center p-8">Partner hittades inte.</p>;

  return (
    <>
      <style>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
        }
        body { font-family: 'Inter', sans-serif; background: white; }
      `}</style>

      <div className="no-print p-4 bg-muted text-center text-sm text-muted-foreground">
        Utskrift startar automatiskt. <button onClick={() => window.print()} className="underline">Skriv ut manuellt</button>
      </div>

      <div style={{ width: "210mm", minHeight: "297mm", margin: "0 auto", padding: "20mm", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", boxSizing: "border-box" }}>
        <div style={{ fontSize: "64px", marginBottom: "16px" }}>🐾</div>

        <h1 style={{ fontSize: "36px", fontWeight: "800", margin: "0 0 8px", color: "#1a1a1a" }}>
          Spara pengar på Amazon!
        </h1>

        <p style={{ fontSize: "18px", color: "#555", marginBottom: "32px", maxWidth: "400px", lineHeight: 1.5 }}>
          Scanna QR-koden och bevaka dina produkter — få notis när priset sjunker!
        </p>

        <div style={{ padding: "24px", border: "3px solid #2d9e6b", borderRadius: "16px", marginBottom: "32px", background: "#f0faf5" }}>
          <QRCodeSVG value={partnerUrl} size={220} fgColor="#1a1a1a" />
        </div>

        <p style={{ fontSize: "14px", color: "#888", marginBottom: "8px" }}>Eller besök:</p>
        <p style={{ fontSize: "16px", fontWeight: "600", color: "#2d9e6b", marginBottom: "40px" }}>
          prisfall.se/p/{slug}
        </p>

        <div style={{ display: "flex", gap: "32px", marginBottom: "40px" }}>
          {["Gratis att använda", "E-postnotis vid prisfall", "Bevakar automatiskt"].map(t => (
            <div key={t} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "28px", marginBottom: "4px" }}>✅</div>
              <p style={{ fontSize: "13px", color: "#555", maxWidth: "100px", lineHeight: 1.3 }}>{t}</p>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "20px", width: "100%" }}>
          <p style={{ fontSize: "13px", color: "#aaa" }}>
            Rekommenderas av <strong>{partner.name}</strong>
            {partner.city ? ` — ${partner.city}` : ""}
          </p>
        </div>
      </div>
    </>
  );
}