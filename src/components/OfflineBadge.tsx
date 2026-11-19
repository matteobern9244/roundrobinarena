import { useSyncExternalStore } from "react";

function subscribeOnline(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/**
 * Mostra un badge "OFFLINE" quando il browser non ha connessione.
 * Usa stile arcade neon coerente col design system. Sul server e durante
 * l'idratazione si considera online, quindi il badge non viene renderizzato.
 */
export function OfflineBadge() {
  const online = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );

  if (online) return null;

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
