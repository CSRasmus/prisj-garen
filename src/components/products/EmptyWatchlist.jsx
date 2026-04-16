import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Eye, Plus, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";

export default function EmptyWatchlist() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="w-20 h-20 rounded-2xl bg-accent flex items-center justify-center mb-6">
        <Eye className="w-10 h-10 text-primary" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Ingen bevakning ännu</h2>
      <p className="text-muted-foreground max-w-sm mb-8">
        Lägg till Amazon-produkter du vill bevaka så håller vi koll på priset åt dig.
      </p>
      <Link to="/add">
        <Button size="lg" className="gap-2">
          <Plus className="w-4 h-4" />
          Lägg till produkt
        </Button>
      </Link>
      <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left max-w-lg">
        {[
          { icon: Plus, title: "Lägg till", desc: "Klistra in en Amazon-länk" },
          { icon: TrendingDown, title: "Bevaka", desc: "Vi kollar priset dagligen" },
          { icon: Eye, title: "Notis", desc: "Få e-post vid prisfall" },
        ].map((step, i) => (
          <div key={i} className="flex flex-col items-center text-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
              <step.icon className="w-5 h-5 text-foreground" />
            </div>
            <p className="font-medium text-sm">{step.title}</p>
            <p className="text-xs text-muted-foreground">{step.desc}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}