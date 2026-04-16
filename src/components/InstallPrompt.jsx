import { useState, useEffect } from "react";
import { X, Share, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "prisjagaren_install_dismissed";
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}

function isInStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
}

export default function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    // Don't show if already installed
    if (isInStandaloneMode()) return;

    // Check if dismissed recently
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed && Date.now() - parseInt(dismissed) < ONE_WEEK_MS) return;

    const isApple = isIOS();
    setIos(isApple);

    if (isApple) {
      // iOS: show custom banner after 30s
      const t = setTimeout(() => setVisible(true), 30000);
      return () => clearTimeout(t);
    } else {
      // Android/Chrome: wait for beforeinstallprompt
      const handler = (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
        const t = setTimeout(() => setVisible(true), 30000);
        return () => clearTimeout(t);
      };
      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
    }
    setDeferredPrompt(null);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 20 }}
          className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto"
        >
          <div className="bg-[#16a34a] text-white rounded-2xl shadow-2xl p-4 flex items-start gap-3">
            {/* App icon */}
            <div className="shrink-0 w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
              🏷️
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm leading-tight">Installera PrisJägaren</p>
              {ios ? (
                <p className="text-xs text-white/85 mt-1 leading-snug">
                  Tryck på{" "}
                  <span className="inline-flex items-center gap-0.5 font-semibold">
                    <Share className="w-3 h-3" /> dela
                  </span>{" "}
                  och välj <span className="font-semibold">"Lägg till på hemskärmen"</span>
                </p>
              ) : (
                <p className="text-xs text-white/85 mt-1 leading-snug">
                  Installera appen för snabb åtkomst och offline-stöd
                </p>
              )}

              {!ios && (
                <button
                  onClick={handleInstall}
                  className="mt-2 bg-white text-[#16a34a] text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-white/90 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Installera
                </button>
              )}
            </div>

            {/* Close */}
            <button
              onClick={dismiss}
              className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}