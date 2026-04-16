import React, { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";

export default function PriceCelebration({ show, onDone }) {
  const hasFiredRef = useRef(false);

  useEffect(() => {
    if (show && !hasFiredRef.current) {
      hasFiredRef.current = true;
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#22c55e", "#16a34a", "#4ade80", "#bbf7d0", "#ffffff"],
      });
      const timer = setTimeout(() => {
        onDone?.();
        hasFiredRef.current = false;
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onDone]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.9 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground px-6 py-3 rounded-2xl shadow-xl font-semibold text-sm flex items-center gap-2"
        >
          🎉 Priset har sjunkit!
        </motion.div>
      )}
    </AnimatePresence>
  );
}