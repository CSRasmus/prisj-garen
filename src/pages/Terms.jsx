import React, { useEffect } from "react";
import { Link } from "react-router-dom";

function Section({ title, children }) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
    </div>
  );
}

export default function Terms() {
  useEffect(() => {
    document.title = "Användarvillkor — Prisfall";
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background font-inter">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="text-lg font-extrabold text-foreground tracking-tight">📉 Prisfall</Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Tillbaka</Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-12 space-y-10">
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-foreground">Användarvillkor</h1>
          <p className="text-sm text-muted-foreground">Senast uppdaterad: April 2026</p>
        </div>

        <Section title="1. Tjänsten">
          <p>Prisfall är en <strong>gratis</strong> prisbevakningstjänst för Amazon.se. Inga dolda avgifter, inga prenumerationer.</p>
          <p>Tjänsten finansieras via Amazon Associates-programmet — en affiliate-provision när användare handlar via våra länkar. Det kostar dig ingenting extra.</p>
        </Section>

        <Section title="2. Prisdata">
          <p>Prisfall hämtar prisdata från Amazon.se för att hjälpa dig bevaka dina produkter. Observera att:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Prisdata är <strong>vägledande</strong> och kan ha en kort fördröjning</li>
            <li>Vi <strong>garanterar inte</strong> att visade priser alltid stämmer 100% exakt</li>
            <li>Det faktiska priset vid köptillfället kan skilja sig från det visade priset</li>
            <li>Alltid kontrollera priset direkt på Amazon.se innan du handlar</li>
          </ul>
        </Section>

        <Section title="3. Ansvarsbegränsning">
          <p>Prisfall är ett informationsverktyg. Vi ansvarar inte för:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Köp gjorda via externa Amazon-länkar</li>
            <li>Prisskillnader mellan vad vi visar och vad Amazon debiterar</li>
            <li>Eventuella förluster till följd av beslut baserade på vår prisdata</li>
            <li>Tekniska avbrott som kan påverka prisbevakningen tillfälligt</li>
          </ul>
        </Section>

        <Section title="4. Användarkonton">
          <ul className="list-disc list-inside space-y-1">
            <li>Du ansvarar för att hålla dina inloggningsuppgifter säkra</li>
            <li>Missbruk av tjänsten kan leda till att kontot stängs</li>
            <li>Du kan radera ditt konto när som helst — kontakta <a href="mailto:hej@prisfall.se" className="text-primary hover:underline">hej@prisfall.se</a></li>
          </ul>
        </Section>

        <Section title="5. Åldergräns">
          <p>Prisfall riktar sig till användare som är <strong>18 år eller äldre</strong>. Genom att registrera dig bekräftar du att du uppfyller detta krav.</p>
        </Section>

        <Section title="6. Ändringar av tjänsten">
          <p>Vi förbehåller oss rätten att när som helst:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Ändra, lägga till eller ta bort funktioner i tjänsten</li>
            <li>Uppdatera dessa villkor — vi meddelar dig vid väsentliga ändringar</li>
            <li>Avsluta tjänsten med rimlig förvarning</li>
          </ul>
        </Section>

        <Section title="7. Tillämpar lag">
          <p>Dessa villkor regleras av <strong>svensk lag</strong>. Eventuella tvister ska i första hand lösas genom dialog — kontakta oss på <a href="mailto:hej@prisfall.se" className="text-primary hover:underline">hej@prisfall.se</a>.</p>
        </Section>

        <div className="border-t border-border pt-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <Link to="/integritetspolicy" className="hover:text-foreground transition-colors">Integritetspolicy</Link>
          <Link to="/" className="hover:text-foreground transition-colors">Tillbaka till startsidan</Link>
        </div>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © 2026 Prisfall.se — Vi använder affiliate-länkar från Amazon Associates
      </footer>
    </div>
  );
}