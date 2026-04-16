import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

export function usePremium() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then((u) => {
      setUser(u);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const isPremium = !!user?.is_premium && (
    !user?.premium_until || new Date(user.premium_until) > new Date()
  );

  return { user, isPremium, loading };
}