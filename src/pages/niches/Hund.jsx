import React from "react";
import NicheLandingPage from "@/components/niche/NicheLandingPage";

const faqItems = [
  {
    question: "Vilken hundmat svänger mest i pris?",
    answer: "Premium-torrfoder som Royal Canin, Hills Science Plan och Eukanuba brukar ha störst prisvariationer på Amazon.se — ofta 15–30% under kampanjer och Prime Day. Prisfall håller koll åt dig.",
  },
  {
    question: "Hur ofta ändras priset på hundprodukter?",
    answer: "Amazon ändrar priser dagligen, ibland flera gånger per dag. Prisfall kontrollerar varje produkt varje dag och skickar notis direkt när priset sjunker.",
  },
  {
    question: "Kan jag bevaka alla hundfodermärken?",
    answer: "Ja! Du kan bevaka vilken Amazon-produkt som helst — Royal Canin, Hills, Eukanuba, Brit, Taste of the Wild och mer. Klistra bara in Amazon-länken.",
  },
  {
    question: "Är Prisfall gratis för hundägare?",
    answer: "Ja, Prisfall är helt gratis att använda. Du kan bevaka upp till 5 produkter utan kostnad, och med ett referral kan du utöka till fler.",
  },
];

export default function Hund() {
  return (
    <NicheLandingPage
      niche="hund"
      emoji="🐶"
      title="Aldrig mer betala för mycket för hundmat"
      description="Bevaka priser på Royal Canin, Hills, Eukanuba och mer — få notis direkt när priset sjunker på Amazon.se"
      schemaName="hundprodukter"
      keywords={["hundmat pris", "Royal Canin billigt", "Hills Science Plan erbjudande", "hundprodukter Amazon"]}
      exampleProducts={["Royal Canin Adult", "Hills Science Plan", "Eukanuba Adult", "Hundgodis Dreamies", "Kong leksak"]}
      faqItems={faqItems}
    />
  );
}