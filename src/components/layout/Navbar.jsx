import React from "react";
import { Link, useLocation } from "react-router-dom";
import { TrendingDown, Eye, Plus, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const niches = [
    { to: "/deals", label: "🏆 Bästsäljare" },
    { to: "/hund", label: "🐶 Hund" },
    { to: "/katt", label: "🐱 Katt" },
    { to: "/barn", label: "👶 Barn" },
    { to: "/elektronik", label: "📱 Elektronik" },
    { to: "/hem", label: "🏠 Hem" },
  ];

  const links = [
    { to: "/dashboard", label: "Bevakningar", icon: Eye },
    { to: "/add", label: "Lägg till", icon: Plus },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">Prisfall</span>
          </Link>

          <div className="hidden md:flex items-center gap-0.5 border-r border-border pr-3 mr-1">
            {niches.map((n) => (
              <Link key={n.to} to={n.to}>
                <Button
                  variant={isActive(n.to) ? "secondary" : "ghost"}
                  size="sm"
                  className="text-xs h-7 px-2"
                >
                  {n.label}
                </Button>
              </Link>
            ))}
          </div>
          <div className="hidden sm:flex items-center gap-1">
            {links.map((link) => (
              <Link key={link.to} to={link.to}>
                <Button
                  variant={isActive(link.to) ? "default" : "ghost"}
                  size="sm"
                  className="gap-2"
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Button>
              </Link>
            ))}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="sm:hidden border-t overflow-hidden"
          >
            <div className="px-4 py-3 space-y-1">
              {links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                >
                  <Button
                    variant={isActive(link.to) ? "default" : "ghost"}
                    className="w-full justify-start gap-2"
                  >
                    <link.icon className="w-4 h-4" />
                    {link.label}
                  </Button>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}