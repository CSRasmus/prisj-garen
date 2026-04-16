import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    emoji: "🏷️",
    title: "Välkommen till PrisJägaren!",
    body: "Du kommer aldrig mer behöva betala för mycket på Amazon. Vi håller koll åt dig — helt gratis.",
    cta: "Nästa →",
  },
  {
    emoji: null,
    title: "Så här funkar det",
    body: null,
    cta: "Nästa →",
  },
  {
    emoji: null,
    title: "Redo att börja spara?",
    body: "Lägg till din första produkt nu — det tar 10 sekunder!",
    cta: "Lägg till min första produkt →",
  },
];

const HOW_IT_WORKS = [
  { icon: "🔍", label: "Lägg till produkt", desc: "Klistra in en Amazon-länk" },
  { icon: "👁️", label: "Vi bevakar", desc: "Automatiskt varje dag" },
  { icon: "🔔", label: "Du får notis", desc: "Mail direkt vid prissänkning" },
];

export default function OnboardingModal({ onClose }) {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  const dismiss = () => {
    localStorage.setItem("onboarding_shown", "true");
    onClose();
  };

  const handleCta = () => {
    if (step < 2) {
      setStep((s) => s + 1);
    } else {
      localStorage.setItem("onboarding_shown", "true");
      navigate("/add");
      onClose();
    }
  };

  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={dismiss}
      />

      {/* Modal */}
      <motion.div
        className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl"
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
      >
        {/* Green gradient header */}
        <div className="bg-gradient-to-br from-primary to-emerald-400 px-6 pt-8 pb-6 text-center relative">
          <button
            onClick={dismiss}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Step dots */}
          <div className="flex justify-center gap-2 mb-4">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i === step ? "w-6 h-2 bg-white" : "w-2 h-2 bg-white/40"
                }`}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              {current.emoji && (
                <div className="text-5xl mb-3">{current.emoji}</div>
              )}
              <h2 className="text-white font-extrabold text-xl leading-tight">
                {current.title}
              </h2>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              {step === 1 ? (
                <div className="space-y-3">
                  {HOW_IT_WORKS.map(({ icon, label, desc }) => (
                    <div key={label} className="flex items-center gap-4 bg-muted/40 rounded-xl px-4 py-3">
                      <span className="text-2xl">{icon}</span>
                      <div>
                        <p className="font-semibold text-sm text-foreground">{label}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                current.body && (
                  <p className="text-muted-foreground text-sm leading-relaxed text-center">
                    {current.body}
                  </p>
                )
              )}
            </motion.div>
          </AnimatePresence>

          <Button
            onClick={handleCta}
            className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20"
          >
            {current.cta}
          </Button>

          {step === 2 && (
            <button
              onClick={dismiss}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Utforska appen först
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}