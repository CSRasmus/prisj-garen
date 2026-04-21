import React from "react";
import NicheLandingPage from "@/components/niche/NicheLandingPage";

const faqItems = [
  {
    question: "När är det bäst att köpa elektronik på Amazon?",
    answer: "Elektronik är billigast under Prime Day (juli), Black Friday och efter nyår när ny teknik lanseras. Prisfall håller koll varje dag och meddelar dig direkt när ditt pris nås.",
  },
  {
    question: "Kan jag bevaka AirPods och hörlurar?",
    answer: "Ja! AirPods Pro och andra hörlurar är bland de mest bevakade produkterna på Prisfall. Priset varierar ofta 200–800 kr — Prisfall ser till att du köper vid rätt tillfälle.",
  },
  {
    question: "Hur vet jag om priset verkligen är lågt?",
    answer: "Prisfall analyserar 90 dagars prishistorik. Du ser direkt om dagens pris är lågt, normalt eller högt — och vi flaggar tydligt när det är 'lägsta priset på länge'.",
  },
  {
    question: "Kan jag sätta ett målpris för min elektronik?",
    answer: "Ja! Med Prisfall kan du sätta ett exakt målpris. Du får notis precis när produkten kostar det du vill betala — inte bara när priset generellt sjunker.",
  },
];

export default function Elektronik() {
  return (
    <NicheLandingPage
      niche="elektronik"
      emoji="📱"
      title="Köp elektronik när priset är som lägst"
      description="Bevaka AirPods, Samsung, laptops och mer — vi varnar direkt när priset sjunker på Amazon.se"
      schemaName="elektronik"
      keywords={["AirPods billigt", "Samsung hörlurar pris", "laptop rea Amazon", "smartwatch erbjudande"]}
      exampleProducts={["Apple AirPods Pro", "Samsung Galaxy Buds", "Garmin Smartwatch", "Anker laddare", "Sony hörlurar"]}
      faqItems={faqItems}
    />
  );
}