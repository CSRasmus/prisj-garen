import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    emoji: "🏷️",
    title: "Välkommen till Prisfall!",
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
    emoji: "📱",
    title: "Spara som app på din telefon",
    body: "Prisfall fungerar som en riktig app — utan App Store!",
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

function detectOS() {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "desktop";
}

export default function OnboardingModal({ onClose }) {
  const [step, setStep] = useState(0);
  const [appInstalled, setAppInstalled] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupported, setPushSupported] = useState(typeof Notification !== "undefined");
  const navigate = useNavigate();
  const os = detectOS();

  const dismiss = () => {
    localStorage.setItem("onboarding_shown", "true");
    onClose();
  };

  const handleRequestNotification = async () => {
    if (!("Notification" in window)) {
      alert("Din webbläsare stöder inte push-notiser.");
      return;
    }

    if (Notification.permission === "granted") {
      setPushEnabled(true);
      await savePushSubscription();
      return;
    }

    if (Notification.permission === "denied") return;

    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      setPushEnabled(true);
      await savePushSubscription();
    }
  };

  const savePushSubscription = async () => {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription() ||
        await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: undefined,
        });

      const { base44 } = await import("@/api/base44Client");
      await base44.entities.PushSubscription.create({
        subscription_json: JSON.stringify(subscription),
      });
    } catch (err) {
      console.error("Failed to save push subscription:", err);
    }
  };

  const handleCta = () => {
    if (step < 3) {
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
              ) : step === 2 ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    {current.body}
                  </p>

                  {os === "ios" ? (
                    <div className="bg-accent/20 rounded-xl p-4 space-y-3">
                      <p className="text-sm font-semibold text-foreground">Safari på iPhone/iPad:</p>
                      <ol className="space-y-2 text-sm text-foreground list-decimal list-inside">
                        <li>Tryck på dela-ikonen längst ned</li>
                        <li>Scrolla ned och tryck "Lägg till på hemskärmen"</li>
                        <li>Tryck "Lägg till" — klart!</li>
                      </ol>
                    </div>
                  ) : os === "android" ? (
                    <div className="bg-accent/20 rounded-xl p-4 space-y-3">
                      <p className="text-sm font-semibold text-foreground">Chrome på Android:</p>
                      <ol className="space-y-2 text-sm text-foreground list-decimal list-inside">
                        <li>Tryck på meny-ikonen ⋮ uppe till höger</li>
                        <li>Tryck "Lägg till på startskärmen"</li>
                        <li>Tryck "Lägg till" — klart!</li>
                      </ol>
                    </div>
                  ) : (
                    <div className="bg-muted/40 rounded-xl p-4 text-center">
                      <p className="text-xs text-muted-foreground">Öppna denna sida på din telefon för installationsinstruktioner</p>
                    </div>
                  )}

                  <label className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl cursor-pointer hover:bg-muted/60 transition-colors">
                    <input
                      type="checkbox"
                      checked={appInstalled}
                      onChange={(e) => setAppInstalled(e.target.checked)}
                      className="w-5 h-5 rounded"
                    />
                    <span className="text-sm font-medium">Jag har installerat appen ✓</span>
                  </label>
                </div>
              ) : step === 3 ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground text-center">
                    {current.body}
                  </p>

                  {pushSupported && Notification.permission !== "denied" && (
                    <Button
                      variant={pushEnabled ? "default" : "outline"}
                      className="w-full gap-2"
                      onClick={handleRequestNotification}
                      disabled={pushEnabled}
                    >
                      🔔 {pushEnabled ? "Push-notiser aktiverade ✅" : "Aktivera push-notiser"}
                    </Button>
                  )}

                  {Notification.permission === "denied" && (
                    <div className="p-3 bg-muted/40 rounded-xl text-center text-xs text-muted-foreground">
                      Inga problem — du får notiser via e-post istället.
                    </div>
                  )}

                  {!pushSupported && (
                    <div className="p-3 bg-muted/40 rounded-xl text-center text-xs text-muted-foreground">
                      Din webbläsare stöder inte push-notiser ännu. Du får notiser via e-post.
                    </div>
                  )}
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

          {step === 3 && (
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