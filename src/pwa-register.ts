/**
 * Service Worker registration. Client-only.
 *
 * Skipped automatically when:
 *  - we are running inside an iframe (Lovable editor preview)
 *  - we are on a Lovable preview/editor host
 *
 * Existing service workers in those contexts are unregistered to avoid stale
 * caches polluting the editor.
 */

let initialized = false;

export type PwaCallbacks = {
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
};

/** Returns a function to trigger update + reload, or null if SW disabled. */
export async function initPWA(
  cbs: PwaCallbacks = {},
): Promise<((reload?: boolean) => Promise<void>) | null> {
  if (typeof window === "undefined") return null;
  if (initialized) return null;
  initialized = true;

  // Detect iframe
  let inIframe = false;
  try {
    inIframe = window.self !== window.top;
  } catch {
    inIframe = true;
  }

  const host = window.location.hostname;
  const isPreviewHost =
    host.includes("id-preview--") || host.includes("lovableproject.com");

  if (inIframe || isPreviewHost) {
    // Cleanup any leftover SW so the editor preview stays fresh.
    if ("serviceWorker" in navigator) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      } catch {
        /* ignore */
      }
    }
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
    });
    return updateSW;
  } catch {
    return null;
  }
}
