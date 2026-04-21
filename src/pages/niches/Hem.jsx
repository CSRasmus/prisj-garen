import React from "react";
import NicheLandingPage from "@/components/niche/NicheLandingPage";

const faqItems = [
  {
    question: "Kan jag bevaka robotdammsugare på Amazon?",
    answer: "Ja! Roomba och andra robotdammsugare är populära att bevaka — priset varierar ofta 500–2000 kr. Prisfall meddelar dig när det är dags att slå till.",
  },
  {
    question: "Är kaffemaskiner billigare på Amazon än i butik?",
    answer: "Ofta ja, speciellt Nespresso och Philips-maskiner. Med Prisfall vet du exakt när Amazon-priset underskrider butikspriset — och du slipper leta runt.",
  },
  {
    question: "Hur bevakar jag sängkläder och textilier?",
    answer: "Klistra in Amazon-länken till produkten i Prisfall. Vi kontrollerar priset varje dag och skickar ett mail när priset sjunker till ett bra nivå.",
  },
  {
    question: "Fungerar Prisfall för alla hemprodukter?",
    answer: "Ja! Allt som säljs på Amazon.se kan bevakas — luftrenare, köksmaskiner, lampor, kuddar, mattor, verktyg och mer.",
  },
];

export default function Hem() {
  return (
    <NicheLandingPage
      niche="hem"
      emoji="🏠"
      title="Spara på hemprodukter och vitvaror"
      description="Bevaka robotdammsugare, köksmaskiner och heminredning — vi varnar när priset sjunker på Amazon.se"
      schemaName="hemprodukter"
      keywords={["Roomba billigt", "Nespresso rea", "luftrenare pris Amazon", "hemprodukter erbjudande"]}
      exampleProducts={["iRobot Roomba", "Nespresso Vertuo", "Blueair luftrenare", "Bambu sängkläder", "OBH köksmaskin"]}
      faqItems={faqItems}
    />
  );
}