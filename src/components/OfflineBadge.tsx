import { useEffect, useState } from "react";

/**
 * Mostra un badge "OFFLINE" quando il browser non ha connessione.
 * Usa stile arcade neon coerente col design system.
 */
export function OfflineBadge() {
  const [online, setOnline] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (!mounted || online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed left-1/2 z-50 -translate-x-1/2 rounded-full border border-neon-gold/60 bg-card/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-neon-gold shadow-lg backdrop-blur"
      style={{
        top: "calc(env(safe-area-inset-top, 0px) + 8px)",
        boxShadow: "0 0 12px color-mix(in oklab, var(--neon-gold) 50%, transparent)",
      }}
    >
      ● Offline
    </div>
  );
}
