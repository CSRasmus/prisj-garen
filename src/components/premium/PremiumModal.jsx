import React from "react";
import { useNavigate } from "react-router-dom";
import { Crown, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export default function PremiumModal({ open, onClose, reason = "produktgränsen" }) {
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative bg-card rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-5"
          >
            <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto">
                <Crown className="w-7 h-7 text-amber-500" />
              </div>
              <h2 className="text-xl font-bold">Uppgradera till Premium</h2>
              <p className="text-sm text-muted-foreground">
                Du har nått {reason}. Med Premium kan du bevaka obegränsat antal produkter.
              </p>
            </div>
            <ul className="space-y-2">
              {["Obegränsat antal produkter", "Eget målpris per produkt", "SMS-notiser", "Var 6:e timme uppdatering"].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-amber-500 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="space-y-2">
              <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white gap-2" onClick={() => { onClose(); navigate("/premium"); }}>
                <Crown className="w-4 h-4" />
                Se Premium — från 29 kr/mån
              </Button>
              <Button variant="ghost" className="w-full text-muted-foreground text-sm" onClick={onClose}>
                Inte nu
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}