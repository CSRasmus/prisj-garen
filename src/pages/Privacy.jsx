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

export default function Privacy() {
  useEffect(() => {
    document.title = "Integritetspolicy — Prisfall";
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
          <h1 className="text-3xl font-extrabold text-foreground">Integritetspolicy</h1>
          <p className="text-sm text-muted-foreground">Senast uppdaterad: April 2026</p>
        </div>

        <Section title="1. Vem vi är">
          <p>Prisfall är en gratis prisbevakningstjänst för Amazon.se som hjälper dig att aldrig missa ett bra pris. Vi meddelar dig när dina bevakade produkter sjunker i pris.</p>
          <p>Kontakt: <a href="mailto:hej@prisfall.se" className="text-primary hover:underline">hej@prisfall.se</a></p>
        </Section>

        <Section title="2. Vilken data vi samlar in">
          <ul className="list-disc list-inside space-y-1">
            <li><strong>E-postadress</strong> — för att skapa ditt konto och skicka prisnotiser</li>
            <li><strong>Bevakade produkter</strong> — de ASIN-nummer du väljer att följa</li>
            <li><strong>Prisdata</strong> — historisk prisinformation från Amazon.se (offentligt tillgänglig data)</li>
            <li><strong>Teknisk data</strong> — IP-adress och webbläsartyp hanteras av vår plattformsleverantör (Base44)</li>
          </ul>
          <p>Vi samlar <strong>aldrig</strong> in betalningsinformation — alla köp sker direkt på Amazon.se.</p>
        </Section>

        <Section title="3. Hur vi använder datan">
          <ul className="list-disc list-inside space-y-1">
            <li>Skicka prisnotiser via e-post när dina bevakade produkter sjunker i pris</li>
            <li>Visa din prishistorik och statistik i appen</li>
            <li>Förbättra och utveckla tjänsten</li>
          </ul>
          <p className="font-semibold text-foreground">Vi säljer aldrig din personliga data till tredje part.</p>
        </Section>

        <Section title="4. Affiliate-upplysning">
          <p>Prisfall tjänar pengar via <strong>Amazon Associates-programmet</strong>. Det innebär att:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>När du klickar på en länk och handlar på Amazon kan vi få en liten provision</li>
            <li>Det kostar dig ingenting extra — du betalar samma pris oavsett</li>
            <li>Affiliate-intäkter gör det möjligt för oss att hålla tjänsten gratis</li>
          </ul>
          <p>Vi är transparenta med detta och det påverkar inte vilka produkter vi visar eller hur vi beräknar priserna.</p>
        </Section>

        <Section title="5. Cookies">
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Nödvändiga cookies</strong> — används för att hålla dig inloggad och säkra din session</li>
            <li>Vi använder <strong>inga tracking-cookies från tredje part</strong></li>
            <li>Vi kör ingen Google Analytics eller liknande spårning</li>
          </ul>
        </Section>

        <Section title="6. Dina rättigheter (GDPR)">
          <p>Som användare av Prisfall har du följande rättigheter enligt GDPR:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Rätt till tillgång</strong> — du kan begära en kopia av all data vi har om dig</li>
            <li><strong>Rätt till radering</strong> — du kan radera ditt konto och all associerad data när som helst</li>
            <li><strong>Rätt till dataportabilitet</strong> — du kan begära ett exporterat utdrag av dina bevakade produkter</li>
            <li><strong>Rätt till rättelse</strong> — du kan korrigera felaktig information om dig</li>
            <li><strong>Rätt att invända</strong> — du kan när som helst avaktivera e-postnotiser</li>
          </ul>
          <p>För att utöva dina rättigheter, kontakta oss på: <a href="mailto:hej@prisfall.se" className="text-primary hover:underline">hej@prisfall.se</a></p>
        </Section>

        <Section title="7. Datalagring">
          <ul className="list-disc list-inside space-y-1">
            <li>Din data lagras på <strong>Base44s servrar inom EU</strong></li>
            <li>Prishistorik sparas i maximalt <strong>365 dagar</strong></li>
            <li>Vid kontoradering raderas all personlig data (e-post, bevakade produkter) inom 30 dagar</li>
            <li>Anonymiserad prisdata kan behållas för statistiska ändamål</li>
          </ul>
        </Section>

        <Section title="8. Tredjepartsleverantörer">
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Base44</strong> — vår teknikplattform (hosting, databas, autentisering) — <a href="https://base44.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">base44.com</a></li>
            <li><strong>Amazon Associates</strong> — affiliate-program för produktlänkar</li>
          </ul>
        </Section>

        <Section title="9. Kontakt och klagomål">
          <p>Har du frågor om din integritet eller vill utöva dina GDPR-rättigheter, kontakta oss:</p>
          <p><a href="mailto:hej@prisfall.se" className="text-primary hover:underline">hej@prisfall.se</a></p>
          <p>Du har också rätt att lämna klagomål till <strong>Integritetsskyddsmyndigheten (IMY)</strong> på <a href="https://www.imy.se" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">imy.se</a>.</p>
        </Section>

        <div className="border-t border-border pt-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <Link to="/villkor" className="hover:text-foreground transition-colors">Användarvillkor</Link>
          <Link to="/" className="hover:text-foreground transition-colors">Tillbaka till startsidan</Link>
        </div>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © 2026 Prisfall.se — Vi använder affiliate-länkar från Amazon Associates
      </footer>
    </div>
  );
}