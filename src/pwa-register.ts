/**
 * Service Worker registration. Client-only.
 *
 * Skipped automatically quando:
 *  - non siamo in build di produzione
 *  - siamo dentro un iframe (preview dell'editor Lovable)
 *  - siamo su un host di preview/editor Lovable
 *  - l'URL contiene ?sw=off (kill switch)
 *
 * Nei contesti bloccati i Service Worker esistenti vengono deregistrati per
 * evitare che cache stantie inquinino la preview.
 */

let initialized = false;

export type PwaCallbacks = {
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
};

function isPreviewHost(host: string): boolean {
  return (
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" ||
    host.endsWith(".beta.lovable.dev")
  );
}

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

  let inIframe = false;
  try {
    inIframe = window.self !== window.top;
  } catch {
    inIframe = true;
  }

  const host = window.location.hostname;
  const killSwitch = new URLSearchParams(window.location.search).get("sw") === "off";

  if (!import.meta.env.PROD || inIframe || isPreviewHost(host) || killSwitch) {
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
