import React, { useState } from "react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const AFFILIATE_TAG = "priskoll-21";

function PhoneMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.6 }}
      className="relative mx-auto w-64 sm:w-72"
    >
      {/* Phone frame */}
      <div className="relative bg-white dark:bg-gray-900 rounded-[2.5rem] border-4 border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden">
        {/* Status bar */}
        <div className="bg-gray-50 dark:bg-gray-800 px-6 py-2 flex justify-between items-center">
          <span className="text-[10px] font-semibold text-gray-500">9:41</span>
          <div className="w-16 h-3 bg-black dark:bg-white rounded-full" />
          <span className="text-[10px] text-gray-500">●●●</span>
        </div>
        {/* App content mockup */}
        <div className="bg-background p-4 space-y-3">
          <div className="text-xs font-bold text-foreground">Mina bevakningar</div>
          {/* Product card 1 - low price */}
          <div className="rounded-xl border-2 border-primary/40 bg-card p-3">
            <div className="flex gap-2 items-center">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg">🎧</div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-foreground line-clamp-1">Sony WH-1000XM5</p>
                <p className="text-base font-extrabold text-primary">2 299 kr</p>
              </div>
              <span className="text-[9px] font-bold bg-primary text-white px-1.5 py-0.5 rounded-full">🔥 Lägst!</span>
            </div>
          </div>
          {/* Product card 2 - normal */}
          <div className="rounded-xl border border-border bg-card p-3 opacity-80">
            <div className="flex gap-2 items-center">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-lg">📦</div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-foreground line-clamp-1">Royal Canin Adult 10kg</p>
                <p className="text-sm font-bold text-foreground">549 kr</p>
              </div>
              <span className="text-[9px] font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">Normal</span>
            </div>
          </div>
          {/* Notification mockup */}
          <div className="rounded-lg bg-primary/10 border border-primary/20 p-2.5 flex gap-2">
            <span className="text-sm">🔔</span>
            <div>
              <p className="text-[9px] font-bold text-primary">Prisnotis!</p>
              <p className="text-[9px] text-foreground/70">AirPods Pro sjönk 400 kr</p>
            </div>
          </div>
        </div>
      </div>
      {/* Glow */}
      <div className="absolute -inset-4 bg-primary/20 rounded-full blur-3xl -z-10" />
    </motion.div>
  );
}

function TestimonialCard({ quote, name, detail, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.4 }}
      className="bg-card border border-border rounded-2xl p-5 space-y-3"
    >
      <p className="text-sm text-foreground/80 italic">"{quote}"</p>
      <div>
        <p className="text-sm font-semibold text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
    </motion.div>
  );
}

function FeatureCard({ emoji, title, desc, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.35 }}
      className="bg-card border border-border rounded-2xl p-5 space-y-2"
    >
      <span className="text-2xl">{emoji}</span>
      <p className="font-semibold text-foreground text-sm">{title}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
    </motion.div>
  );
}

export default function LandingPage() {
  const SLIDER_STEPS = [1000, 2500, 5000, 10000, 15000, 20000, 30000, 50000, 100000];
  const [sliderIndex, setSliderIndex] = useState(4); // default: 15000
  const sliderValue = SLIDER_STEPS[sliderIndex];
  const savings = Math.round(sliderValue * 0.30);
  const monthly = Math.round(savings / 12);
  const daily = Math.round(savings / 365);
  const weekly = Math.round(savings / 52);
  const dogFoodBags = Math.floor(savings / 400);

  const getProductComparison = (m) => {
    if (m < 200) return "ett par billiga hörlurar";
    if (m < 400) return "en bra spelkontroll";
    if (m < 600) return "en ny Bluetooth-högtalare";
    if (m < 900) return "en ny gamingmus eller tangentbord";
    if (m < 1500) return "en ny surfplatta";
    return "en ny iPhone eller laptop";
  };

  const handleLogin = () => base44.auth.redirectToLogin("/dashboard");
  const handleSignup = () => base44.auth.redirectToLogin("/dashboard");

  return (
    <div className="min-h-screen bg-background font-inter">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="text-lg font-extrabold text-foreground tracking-tight">📉 Prisfall</span>
          <div className="flex items-center gap-4">
            <a href="/blogg" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Blogg
            </a>
            <button onClick={handleLogin} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Logga in
            </button>
            <Button onClick={handleSignup} size="sm" className="h-9 px-4 text-sm">
              Kom igång gratis
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-background pt-16 pb-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary/15 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="space-y-6">
            <span className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full border border-primary/20">
              🇸🇪 Byggt för svenska Amazon-shoppare
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-foreground leading-tight tracking-tight">
              Sluta betala för mycket på Amazon
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Prisfall bevakar dina produkter dygnet runt och skickar en notis direkt när priset sjunker. Helt gratis.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={handleSignup} className="h-12 px-6 text-base gap-2 shadow-lg shadow-primary/20">
                Kom igång gratis →
              </Button>
              <a href="#how-it-works">
                <Button variant="outline" className="h-12 px-6 text-base w-full sm:w-auto">
                  Se hur det funkar
                </Button>
              </a>
            </div>
          </motion.div>
          <div className="flex justify-center">
            <PhoneMockup />
          </div>
        </div>
      </section>

      {/* Savings Simulator */}
      <section className="py-20 bg-secondary/30">
        <div className="max-w-2xl mx-auto px-4 text-center space-y-8">
          <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">Hur mycket kan du spara?</h2>
            <p className="text-muted-foreground mt-2">Dra i slidern och se din potentiella besparing</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-6"
          >
            <div className="space-y-3">
              <label className="text-sm font-semibold text-foreground">
                Jag handlar för <span className="text-primary">{sliderValue.toLocaleString("sv-SE")} kr/år</span> på Amazon
              </label>
              <input
                type="range"
                min={0}
                max={SLIDER_STEPS.length - 1}
                step={1}
                value={sliderIndex}
                onChange={(e) => setSliderIndex(Number(e.target.value))}
                className="w-full accent-primary h-2 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1 000 kr</span>
                <span>100 000 kr</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-left">
                <p className="text-xs text-primary font-semibold mb-1">💰 Potentiell besparing/år</p>
                <motion.p
                  key={savings}
                  initial={{ y: -8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="text-2xl font-extrabold text-primary"
                >
                  {savings.toLocaleString("sv-SE")} kr
                </motion.p>
                <motion.p
                  key={"dog-" + savings}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2, delay: 0.05 }}
                  className="text-xs text-primary/70 mt-1"
                >
                  🐾 Det räcker till {dogFoodBags} stora påsar hundmat
                </motion.p>
              </div>
              <div className="bg-secondary/60 border border-border rounded-xl p-4 text-left">
                <p className="text-xs text-muted-foreground font-semibold mb-1">📅 Per månad</p>
                <motion.p
                  key={monthly}
                  initial={{ y: -8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="text-2xl font-extrabold text-foreground"
                >
                  {monthly.toLocaleString("sv-SE")} kr
                </motion.p>
                <motion.p
                  key={"daily-" + daily}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2, delay: 0.05 }}
                  className="text-xs text-muted-foreground mt-1"
                >
                  📱 Det är nästan priset på {getProductComparison(monthly)}
                </motion.p>
              </div>
            </div>
            <div className="bg-muted/40 rounded-lg px-4 py-2 text-center">
              <motion.p
                key={"daily-banner-" + daily}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="text-sm font-semibold text-foreground"
              >
                {daily >= 5
                  ? <>⏱️ Det är <span className="text-primary">{daily} kr</span> sparade varje dag</>
                  : <>📆 Det är <span className="text-primary">{weekly} kr</span> sparade varje vecka</>
                }
              </motion.p>
            </div>
            <p className="text-[11px] text-muted-foreground/70 italic">
              *Baserat på genomsnittliga prisfall på Amazon.se. Faktisk besparing varierar beroende på produkter och köpmönster.
            </p>
            <Button onClick={handleSignup} className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20">
              Börja spara nu — det är gratis
            </Button>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20">
        <div className="max-w-4xl mx-auto px-4 space-y-12">
          <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">Hur det funkar</h2>
            <p className="text-muted-foreground mt-2">Tre enkla steg — klart på under en minut</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { step: "1", emoji: "🔍", title: "Lägg till en produkt", desc: "Klistra in en Amazon-länk eller ASIN-nummer. Vi hämtar all information automatiskt.", delay: 0 },
              { step: "2", emoji: "👁️", title: "Vi bevakar priset", desc: "Prisfall kollar priset varje dag automatiskt och sparar hela prishistoriken.", delay: 0.1 },
              { step: "3", emoji: "🔔", title: "Du får en notis", desc: "När priset är lågt skickar vi ett mail direkt till dig. Du missar aldrig ett bra pris.", delay: 0.2 },
            ].map(({ step, emoji, title, desc, delay }) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay, duration: 0.4 }}
                className="relative bg-card border border-border rounded-2xl p-6 text-center space-y-3"
              >
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-primary text-white text-xs font-bold rounded-full flex items-center justify-center">{step}</span>
                <span className="text-3xl block">{emoji}</span>
                <p className="font-bold text-foreground">{title}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-secondary/30">
        <div className="max-w-4xl mx-auto px-4 space-y-10">
          <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">Allt du behöver — ingenting du inte behöver</h2>
          </motion.div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <FeatureCard emoji="📊" title="Prishistorik" desc="Se pristrenden de senaste 90 dagarna i ett interaktivt diagram." delay={0} />
            <FeatureCard emoji="🎯" title="Målpris" desc="Sätt ditt eget målpris och få notis exakt när det nås." delay={0.05} />
            <FeatureCard emoji="📧" title="E-postnotiser" desc="Få mail direkt när priset sjunker under ditt målpris." delay={0.1} />
            <FeatureCard emoji="🆓" title="Alltid gratis" desc="Inga dolda avgifter, aldrig. Vi tjänar på affiliate — du betalar inget extra." delay={0.15} />
            <FeatureCard emoji="🔄" title="Daglig uppdatering" desc="Priser kollas automatiskt varje natt. Inga manuella åtgärder behövs." delay={0.2} />
            <FeatureCard emoji="📱" title="Installera som app" desc="Lägg till på hemskärmen på iPhone och Android för snabb åtkomst." delay={0.25} />
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 space-y-10">
          <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">Redan populärt bland svenska Amazon-shoppare</h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <TestimonialCard
              quote="Sparade 340 kr på Royal Canin förra månaden! Fick notis precis när priset sjönk."
              name="Anna K."
              detail="Hundägare"
              delay={0}
            />
            <TestimonialCard
              quote="Använder den för allt från kattmat till elektronik. Bästa gratisappen jag hittat."
              name="Marcus L."
              detail="Stockholm"
              delay={0.1}
            />
            <TestimonialCard
              quote="Fick notis om AirPods Pro — sparade 400 kr direkt. Helt magiskt!"
              name="Sara B."
              detail="Göteborg"
              delay={0.2}
            />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <p className="text-sm text-muted-foreground font-medium">
              <span className="text-foreground font-bold">10 000+</span> bevakade produkter&nbsp;•&nbsp;
              <span className="text-foreground font-bold">500+</span> nöjda användare&nbsp;•&nbsp;
              <span className="text-foreground font-bold">50 000+ kr</span> sparade
            </p>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-secondary/30">
        <div className="max-w-2xl mx-auto px-4 space-y-8">
          <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">Vanliga frågor</h2>
          </motion.div>
          <Accordion type="single" collapsible className="space-y-2">
            {[
              { q: "Är Prisfall verkligen gratis?", a: "Ja, alltid. Vi tjänar pengar via affiliate-provision när du handlar via våra länkar — det kostar dig ingenting extra." },
              { q: "Hur många produkter kan jag bevaka?", a: "Upp till 10 produkter gratis." },
              { q: "Vilka produkter kan jag bevaka?", a: "Alla produkter på Amazon.se med en giltig produktlänk eller ASIN-nummer." },
              { q: "Hur ofta uppdateras priserna?", a: "Varje natt kl 03:00 automatiskt. Du kan även uppdatera manuellt när som helst." },
              { q: "Hur får jag notiser?", a: "Via e-post direkt till din inkorg när priset sjunker under ditt målpris eller når en 90-dagars-lägsta." },
            ].map(({ q, a }, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="bg-card border border-border rounded-xl px-4 overflow-hidden">
                <AccordionTrigger className="text-sm font-semibold text-left py-4">{q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-4">{a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Footer CTA */}
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

      {/* Recent Blog Articles */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 space-y-10">
          <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">Senaste från blogg</h2>
            <p className="text-muted-foreground mt-2">Läs våra senaste artiklar om deals och pristips</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <motion.a
              href="/blogg"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              <div className="text-3xl mb-3">📰</div>
              <p className="font-semibold text-foreground">Se alla artiklar</p>
              <p className="text-sm text-muted-foreground mt-2">Utforska veckans deals, köpguider och pristips →</p>
            </motion.a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-5xl mx-auto px-4 text-center text-xs text-muted-foreground space-y-3">
          <div className="flex justify-center gap-6">
            <a href="/blogg" className="hover:text-foreground transition-colors">Blogg</a>
            <a href="/" className="hover:text-foreground transition-colors">Start</a>
          </div>
          <div className="space-y-1">
            <p>📉 Prisfall — Bevaka priser på Amazon.se</p>
            <p>Vi använder affiliate-länkar. När du köper via oss får vi en liten provision — utan extra kostnad för dig.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}