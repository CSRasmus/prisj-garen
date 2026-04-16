import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Smartphone, Gamepad2, Home, Headphones, Plus, Search, Bell, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";

const categories = [
  { icon: Headphones, label: "Hörlurar & Ljud", color: "bg-purple-100 text-purple-600", example: "Sony, Bose, Apple" },
  { icon: Gamepad2, label: "Gaming", color: "bg-blue-100 text-blue-600", example: "PlayStation, Xbox, Nintendo" },
  { icon: Smartphone, label: "Elektronik", color: "bg-orange-100 text-orange-600", example: "Telefoner, Surfplattor" },
  { icon: Home, label: "Hem & Kök", color: "bg-green-100 text-green-600", example: "Robotdammsugare, Kaffemaskiner" },
];

const steps = [
  { icon: Search, step: "1", title: "Sök produkt", desc: "Klistra in en Amazon-länk" },
  { icon: Plus, step: "2", title: "Lägg till", desc: "Vi börjar bevaka priset direkt" },
  { icon: Bell, step: "3", title: "Få notis", desc: "E-post när priset sjunker" },
];

export default function EmptyWatchlist() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="py-8 space-y-12"
    >
      {/* Hero */}
      <div className="text-center space-y-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring" }}
          className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto"
        >
          <TrendingDown className="w-10 h-10 text-primary" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Börja spara pengar idag</h1>
          <p className="text-muted-foreground mt-3 max-w-md mx-auto text-base">
            Lägg till Amazon-produkter du vill köpa — vi håller koll på priset och meddelar dig när det sjunker.
          </p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Link to="/add">
            <Button size="lg" className="gap-2 h-12 px-8 text-base font-semibold shadow-lg shadow-primary/25">
              <Plus className="w-5 h-5" />
              Lägg till din första produkt
            </Button>
          </Link>
        </motion.div>
      </div>

      {/* How it works */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <h2 className="text-center text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6">Så här fungerar det</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.08 }}
              className="relative flex flex-col items-center text-center p-5 rounded-2xl bg-card border border-border/60"
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                {step.step}
              </div>
              <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center mb-3 mt-2">
                <step.icon className="w-6 h-6 text-primary" />
              </div>
              <p className="font-semibold text-sm">{step.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Popular categories */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
        <h2 className="text-center text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6">Populära kategorier att bevaka</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {categories.map((cat, i) => (
            <Link key={i} to="/add">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + i * 0.06 }}
                whileHover={{ scale: 1.03 }}
                className="p-4 rounded-2xl bg-card border border-border/60 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer text-center"
              >
                <div className={`w-10 h-10 rounded-xl ${cat.color} flex items-center justify-center mx-auto mb-2`}>
                  <cat.icon className="w-5 h-5" />
                </div>
                <p className="font-semibold text-xs">{cat.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{cat.example}</p>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}