import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { TrendingDown, Bell, ShieldCheck, Star, ChevronDown, ChevronUp } from "lucide-react";
import { base44 } from "@/api/base44Client";
import NicheBestSellers from "@/components/niche/NicheBestSellers";

// Map niche slug → BestSellerProduct.category
const NICHE_TO_CATEGORY = {
  hund: "Husdjur",
  katt: "Husdjur",
  barn: "Barnprodukter",
  elektronik: "Elektronik",
  hem: "Hem & kök",
};

const niches = [
  { slug: "hund", label: "🐶 Hund" },
  { slug: "katt", label: "🐱 Katt" },
  { slug: "barn", label: "👶 Barn" },
  { slug: "elektronik", label: "📱 Elektronik" },
  { slug: "hem", label: "🏠 Hem" },
];

function FAQItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left font-semibold text-foreground hover:bg-muted/40 transition-colors"
        onClick={() => setOpen(!open)}
      >
        {question}
        {open ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border pt-3">
          {answer}
        </div>
      )}
    </div>
  );
}

export default function NicheLandingPage({
  niche,
  title,
  description,
  emoji,
  keywords,
  exampleProducts,
  faqItems,
  schemaName,
}) {
  const [savings, setSavings] = useState(0);
  const [products, setProducts] = useState(3);

  useEffect(() => {
    document.title = `Bevaka priser på ${schemaName || niche} | Prisfall.se`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", description);
    else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = description;
      document.head.appendChild(m);
    }
    // Schema markup
    const schema = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: `Bevaka priser på ${schemaName || niche} | Prisfall.se`,
      description,
      url: `https://prisfall.se/${niche}`,
      publisher: {
        "@type": "Organization",
        name: "Prisfall",
        url: "https://prisfall.se",
      },
    };
    const existing = document.getElementById("niche-schema");
    if (existing) existing.remove();
    const script = document.createElement("script");
    script.id = "niche-schema";
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
    return () => {
      const el = document.getElementById("niche-schema");
      if (el) el.remove();
    };
  }, [niche, description, schemaName]);

  useEffect(() => {
    setSavings(Math.round(products * 147));
  }, [products]);

  const handleSignup = () => {
    base44.auth.redirectToLogin();
  };

  return (
    <div className="min-h-screen bg-background font-inter">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">Prisfall</span>
          </Link>
          <div className="hidden sm:flex items-center gap-1 flex-wrap">
            {niches.map((n) => (
              <Link key={n.slug} to={`/${n.slug}`}>
                <Button
                  variant={niche === n.slug ? "default" : "ghost"}
                  size="sm"
                  className="text-xs h-8 px-3"
                >
                  {n.label}
                </Button>
              </Link>
            ))}
          </div>
          <Button onClick={handleSignup} size="sm" className="font-semibold">
            Kom igång gratis
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 px-4 text-center bg-gradient-to-b from-accent/40 to-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto space-y-6"
        >
          <div className="text-7xl">{emoji}</div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
            {title}
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto">
            {description}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={handleSignup} size="lg" className="h-14 px-8 text-base font-bold shadow-lg">
              Börja bevaka gratis →
            </Button>
            <Link to="/blogg">
              <Button variant="outline" size="lg" className="h-14 px-6 text-base">
                Läs köpguider
              </Button>
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">✅ Gratis · Inget kreditkort · Avsluta när du vill</p>
        </motion.div>
      </section>

      {/* Savings Simulator */}
      <section className="py-16 px-4">
        <div className="max-w-xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-card border border-border rounded-2xl p-8 shadow-sm text-center space-y-6"
          >
            <h2 className="text-2xl font-extrabold">Hur mycket kan du spara?</h2>
            <p className="text-muted-foreground text-sm">
              Dra i reglaget och se din potentiella besparing per år
            </p>
            <div className="space-y-3">
              <div className="flex justify-between text-sm font-medium">
                <span>Antal produkter du bevakar</span>
                <span className="text-primary font-bold">{products} st</span>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                value={products}
                onChange={(e) => setProducts(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
            <div className="bg-primary/10 rounded-xl px-6 py-4">
              <p className="text-sm text-muted-foreground mb-1">Potentiell besparing per år</p>
              <p className="text-4xl font-extrabold text-primary">{savings.toLocaleString("sv-SE")} kr</p>
              <p className="text-xs text-muted-foreground mt-1">Baserat på ~147 kr besparing per produkt och år</p>
            </div>
            <Button onClick={handleSignup} className="w-full h-12 font-bold text-base">
              Börja spara nu — helt gratis
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Real best sellers from database */}
      {NICHE_TO_CATEGORY[niche] && (
        <NicheBestSellers
          category={NICHE_TO_CATEGORY[niche]}
          title="Populärt just nu"
          limit={6}
        />
      )}

      {/* How it works */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto space-y-10">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-2xl sm:text-3xl font-extrabold">Så enkelt fungerar det</h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: "🔗", title: "1. Klistra in länken", text: "Hitta din produkt på Amazon.se och kopiera länken till Prisfall." },
              { icon: "👁️", title: "2. Vi håller koll", text: "Prisfall kontrollerar priset varje dag — automatiskt och gratis." },
              { icon: "📧", title: "3. Få notis", text: "När priset sjunker skickar vi ett mail direkt till din inkorg." },
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center space-y-3"
              >
                <div className="text-4xl">{step.icon}</div>
                <h3 className="font-bold text-foreground">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust signals */}
      <section className="py-12 px-4 bg-muted/30">
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          {[
            { icon: <ShieldCheck className="w-6 h-6 text-primary mx-auto" />, text: "Ingen registrering av kortuppgifter" },
            { icon: <Star className="w-6 h-6 text-primary mx-auto" />, text: "Tusentals nöjda användare" },
            { icon: <Bell className="w-6 h-6 text-primary mx-auto" />, text: "Notis direkt via e-post" },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="space-y-2"
            >
              {item.icon}
              <p className="text-sm font-medium text-muted-foreground">{item.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4">
        <div className="max-w-2xl mx-auto space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-2xl sm:text-3xl font-extrabold">Vanliga frågor</h2>
          </motion.div>
          <div className="space-y-3">
            {faqItems.map((item, i) => (
              <FAQItem key={i} question={item.question} answer={item.answer} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto px-4 text-center space-y-5"
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Redo att börja spara?</h2>
          <p className="text-primary-foreground/80 text-lg">Gratis för alltid. Inget kreditkort krävs.</p>
          <Button
            onClick={handleSignup}
            variant="secondary"
            className="h-14 px-8 text-base font-bold text-primary shadow-xl"
          >
            Skapa gratis konto →
          </Button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-5xl mx-auto px-4 text-center text-xs text-muted-foreground space-y-4">
          <div>
            <p className="font-semibold text-foreground mb-2">Kategorier</p>
            <div className="flex justify-center gap-4 flex-wrap">
              {niches.map((n) => (
                <Link key={n.slug} to={`/${n.slug}`} className="hover:text-foreground transition-colors">
                  {n.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex justify-center gap-6 flex-wrap">
            <Link to="/" className="hover:text-foreground transition-colors">Start</Link>
            <Link to="/deals" className="hover:text-foreground transition-colors">🔥 Dagens deals</Link>
            <Link to="/blogg" className="hover:text-foreground transition-colors">Blogg</Link>
            <Link to="/integritetspolicy" className="hover:text-foreground transition-colors">Integritetspolicy</Link>
            <Link to="/villkor" className="hover:text-foreground transition-colors">Villkor</Link>
          </div>
          <p>© 2026 Prisfall.se — Vi använder affiliate-länkar från Amazon Associates</p>
        </div>
      </footer>
    </div>
  );
}