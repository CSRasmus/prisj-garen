import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { verifyEmail } from "@/functions/verifyEmail";
import { sendVerificationEmail } from "@/functions/sendVerificationEmail";

export default function VerifyEmail() {
  const [status, setStatus] = useState("loading"); // loading | success | error | expired
  const [errorMessage, setErrorMessage] = useState("");
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      setStatus("error");
      setErrorMessage("Ingen verifieringstoken hittades i länken.");
      return;
    }

    verifyEmail({ token })
      .then((res) => {
        if (res.data?.success) {
          setStatus("success");
        } else {
          const msg = res.data?.error || "Okänt fel";
          setErrorMessage(msg);
          setStatus(msg.includes("gått ut") ? "expired" : "error");
        }
      })
      .catch((err) => {
        const msg = err?.response?.data?.error || err.message || "Verifieringen misslyckades";
        setErrorMessage(msg);
        setStatus(msg.includes("gått ut") ? "expired" : "error");
      });
  }, []);

  // Start countdown and redirect after success
  useEffect(() => {
    if (status !== "success") return;
    if (countdown <= 0) {
      window.location.href = "/dashboard";
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [status, countdown]);

  const handleResend = async () => {
    setResending(true);
    try {
      await sendVerificationEmail({});
      setResent(true);
    } catch {
      // ignore
    }
    setResending(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-100 p-8 text-center space-y-5">

        {status === "loading" && (
          <>
            <div className="flex justify-center">
              <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
            <p className="text-slate-600 font-medium">Verifierar din e-postadress…</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="text-5xl">✅</div>
            <h1 className="text-2xl font-bold text-slate-900">E-post verifierad!</h1>
            <p className="text-slate-600">Välkomstmail har skickats till din inkorg.</p>
            <p className="text-slate-400 text-sm">Omdirigerar till appen om {countdown} sekunder…</p>
            <Link
              to="/dashboard"
              className="inline-block bg-primary text-white font-semibold py-3 px-8 rounded-xl hover:bg-primary/90 transition-colors"
            >
              Gå till mina bevakningar →
            </Link>
          </>
        )}

        {(status === "error" || status === "expired") && (
          <>
            <div className="text-5xl">❌</div>
            <h1 className="text-2xl font-bold text-slate-900">
              {status === "expired" ? "Länken har gått ut" : "Ogiltig länk"}
            </h1>
            <p className="text-slate-600 text-sm">{errorMessage}</p>
            {resent ? (
              <p className="text-green-600 font-medium text-sm">✅ Nytt verifieringsmail skickat! Kolla din inkorg.</p>
            ) : (
              <button
                onClick={handleResend}
                disabled={resending}
                className="inline-block bg-primary text-white font-semibold py-3 px-8 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {resending ? "Skickar…" : "Skicka ny verifieringslänk"}
              </button>
            )}
            <div>
              <Link to="/dashboard" className="text-sm text-slate-400 hover:text-slate-600 underline">
                Gå till dashboard
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}