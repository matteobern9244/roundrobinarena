/**
 * Service Worker registration. Client-only.
 *
 * Skipped automatically quando:
 *  - non siamo in build di produzione
 *  - siamo dentro un iframe (pagina incorporata altrove)
 *  - l'URL contiene ?sw=off (kill switch)
 *
 * In produzione e nelle preview Vercel il SW e' attivo: le preview servono
 * proprio a verificare l'offline prima del rilascio. Nei contesti bloccati i
 * Service Worker esistenti vengono deregistrati per evitare cache stantie.
 */

let initialized = false;

export type PwaCallbacks = {
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
};

async function unregisterAll(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  } catch (err) {
    console.warn("[pwa] unregister failed", err);
  }
}

/** Returns a function to trigger update + reload, or null if SW disabled. */
export async function initPWA(
  cbs: PwaCallbacks = {},
): Promise<((reload?: boolean) => Promise<void>) | null> {
  if (typeof window === "undefined") return null;
  if (initialized) return null;
  initialized = true;

  let inIframe: boolean;
  try {
    inIframe = window.self !== window.top;
  } catch {
    inIframe = true;
  }

  const killSwitch = new URLSearchParams(window.location.search).get("sw") === "off";

  if (!import.meta.env.PROD || inIframe || killSwitch) {
    await unregisterAll();
    return null;
  }

  try {
    const { registerSW } = await import("virtual:pwa-register");
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        cbs.onNeedRefresh?.();
      },
      onOfflineReady() {
        cbs.onOfflineReady?.();
      },
      onRegisterError(error) {
        console.error("[pwa] service worker registration failed", error);
      },
    });
    return updateSW;
  } catch (err) {
    console.error("[pwa] service worker bootstrap failed", err);
    return null;
  }
}
