import React from "react";
import NicheLandingPage from "@/components/niche/NicheLandingPage";

const faqItems = [
  {
    question: "När är kattmat billigast på Amazon?",
    answer: "De bästa priserna hittar du ofta under Prime Day (juli), Black Friday och Amazon:s egna kampanjdagar. Prisfall bevakar priset varje dag så att du inte missar ett enda prisfall.",
  },
  {
    question: "Är det värt att köpa kattmat på Amazon?",
    answer: "Ja! Amazon.se erbjuder ofta lägre priser än fysiska butiker, särskilt på storpack. Med Prisfall vet du exakt när priset är på sin lägsta nivå.",
  },
  {
    question: "Kan jag bevaka kattsand och kattleksaker också?",
    answer: "Absolut! Du kan bevaka vilken produkt som helst på Amazon.se — kattsand, leksaker, klösmöbler, kattmat och mer.",
  },
  {
    question: "Hur snabbt får jag notis när priset sjunker?",
    answer: "Prisfall kontrollerar priser varje dag och skickar e-post samma dag som priset sjunker under ditt bevakade tröskelvärde.",
  },
];

export default function Katt() {
  return (
    <NicheLandingPage
      niche="katt"
      emoji="🐱"
      title="Spara hundratals kronor på kattmat varje år"
      description="Bevaka priser på Whiskas, Felix, Purina och kattsand — aldrig missa ett prisfall på Amazon.se"
      schemaName="kattprodukter"
      keywords={["kattmat billig", "Whiskas erbjudande", "Felix kattmat pris", "kattsand Amazon"]}
      exampleProducts={["Whiskas Adult", "Felix Köttklubba", "Purina One", "Catsan kattsand", "Kattleksak fjäder"]}
      faqItems={faqItems}
    />
  );
}