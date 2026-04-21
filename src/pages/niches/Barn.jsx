import React from "react";
import NicheLandingPage from "@/components/niche/NicheLandingPage";

const faqItems = [
  {
    question: "Hur sparar jag på barnprodukter?",
    answer: "Lägg till produkter du planerar att köpa i Prisfall — blöjor, leksaker, bilstol eller barnvagn — och vänta tills priset sjunker. Du kan spara 20–40% jämfört med att köpa direkt.",
  },
  {
    question: "Kan jag bevaka Pampers och blöjor?",
    answer: "Ja! Blöjor varierar mycket i pris på Amazon.se, särskilt storpack. Prisfall meddelar dig direkt när Pampers, Libero eller Huggies är billigast.",
  },
  {
    question: "Hur bevakar jag LEGO och leksaker inför jul?",
    answer: "Lägg till LEGO-set och önskeleksaker i Prisfall i god tid. Vi bevakar priset löpande och meddelar dig när det är dags att köpa — ofta veckor innan jul.",
  },
  {
    question: "Finns det begränsningar på hur många produkter jag kan bevaka?",
    answer: "Gratis-kontot inkluderar 5 bevakningar. Bjud in en vän så får du 2 extra platser — perfekt för barnfamiljer med många produkter att hålla koll på.",
  },
];

export default function Barn() {
  return (
    <NicheLandingPage
      niche="barn"
      emoji="👶"
      title="Barnprodukter till lägsta priset"
      description="Bevaka priser på blöjor, leksaker, barnmat och mer — få notis direkt när priset sjunker på Amazon.se"
      schemaName="barnprodukter"
      keywords={["Pampers billigt", "LEGO rea", "barnprodukter Amazon", "bilstol pris"]}
      exampleProducts={["Pampers Baby-Dry", "LEGO Classic", "Barnbok Alfons Åberg", "Maxi-Cosi bilstol", "Cybex Priam barnvagn"]}
      faqItems={faqItems}
    />
  );
}