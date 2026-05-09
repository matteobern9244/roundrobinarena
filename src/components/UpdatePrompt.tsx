import { useEffect, useRef, useState } from "react";

import { initPWA } from "@/pwa-register";

/**
 * Registra il Service Worker e mostra un toast quando una nuova versione
 * dell'app è pronta. Cliccando "Aggiorna" si applica subito e si ricarica.
 */
export function UpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const updateRef = useRef<((reload?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    let cancelled = false;
    void initPWA({
      onNeedRefresh: () => {
        if (!cancelled) setNeedRefresh(true);
      },
    }).then((updateSW) => {
      if (cancelled) return;
      updateRef.current = updateSW;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!needRefresh) return null;

  return (
    <div
      role="alert"
      className="fixed inset-x-0 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-2xl border border-neon-cyan/60 bg-card/95 px-4 py-3 text-xs font-bold uppercase tracking-widest text-foreground shadow-2xl backdrop-blur safe-x"
      style={{
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
        boxShadow: "var(--glow-cyan)",
      }}
    >
      <span className="flex-1 text-[10px] tracking-[0.25em]">
        ⚡ Nuova versione disponibile
      </span>
      <button
        type="button"
        onClick={() => {
          void updateRef.current?.(true);
        }}
        className="rounded-md border border-neon-cyan bg-neon-cyan/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-neon-cyan transition-colors hover:bg-neon-cyan/20"
      >
        Aggiorna
      </button>
    </div>
  );
}
