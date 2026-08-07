/// <reference lib="webworker" />
/* eslint-disable @typescript-eslint/no-explicit-any */
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute, setCatchHandler } from "workbox-routing";
import { NetworkFirst, StaleWhileRevalidate, CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";

declare const self: ServiceWorkerGlobalScope;

const HTML_CACHE = "html-pages-v3";
const ASSET_CACHE = "assets-v3";
const IMG_CACHE = "images-fonts-v3";

// Rotte dell'app: l'HTML è generato dal server (SSR su Cloudflare Workers),
// quindi non è nel precache manifest e va scaricato attivamente.
const APP_SHELLS = ["/", "/tournament"];

// Precache di TUTTI gli asset client emessi dalla build (JS/CSS/icone/manifest).
// Workbox garantisce l'atomicità: se un asset manca, l'install fallisce e il
// vecchio SW resta attivo (nessuno stato a metà → nessuno schermo nero).
precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

/** Scarica e cachea la shell HTML di una rotta. Best-effort: se siamo offline
 *  al momento dell'install, ci riprova in activate e comunque ogni navigazione
 *  online aggiorna la cache tramite NetworkFirst. */
async function precacheShellHtml(path: string): Promise<void> {
  try {
    const res = await fetch(path, { cache: "reload", credentials: "same-origin" });
    if (!res || !res.ok) return;
    const cache = await caches.open(HTML_CACHE);
    await cache.put(path, res.clone());
  } catch {
    /* offline: ignora */
  }
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(Promise.all(APP_SHELLS.map(precacheShellHtml)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      // Pulisci solo le nostre cache vecchie (versioni precedenti), lasciando
      // intatte quelle di workbox-precaching.
      const keep = new Set([HTML_CACHE, ASSET_CACHE, IMG_CACHE]);
      const names = await caches.keys();
      await Promise.all(
        names.map((n) =>
          !keep.has(n) && !n.startsWith("workbox-") && !n.includes("precache")
            ? caches.delete(n)
            : Promise.resolve(),
        ),
      );
      // Ritenta il prefetch delle shell (utile se l'install era offline).
      await Promise.all(APP_SHELLS.map(precacheShellHtml));
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Navigazioni → NetworkFirst, salva in HTML_CACHE per offline.
registerRoute(
  ({ request, url }) =>
    request.mode === "navigate" &&
    !url.pathname.startsWith("/api/") &&
    !url.pathname.startsWith("/~oauth"),
  new NetworkFirst({
    cacheName: HTML_CACHE,
    networkTimeoutSeconds: 3,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 30 }),
    ],
  }),
);

// JS / CSS / Worker same-origin non precachati → CacheFirst (URL hashati).
registerRoute(
  ({ request, url }) =>
    (request.destination === "script" ||
      request.destination === "style" ||
      request.destination === "worker") &&
    url.origin === self.location.origin,
  new CacheFirst({
    cacheName: ASSET_CACHE,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 60 }),
    ],
  }),
);

// Immagini / font → CacheFirst.
registerRoute(
  ({ request }) => request.destination === "image" || request.destination === "font",
  new CacheFirst({
    cacheName: IMG_CACHE,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 60 }),
    ],
  }),
);

// Manifest / icone esposti dalla root.
registerRoute(
  ({ url }) =>
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/favicon.ico" ||
    url.pathname.startsWith("/icon-") ||
    url.pathname === "/apple-touch-icon.png",
  new StaleWhileRevalidate({
    cacheName: ASSET_CACHE,
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
  }),
);

/**
 * Fallback offline: se la navigazione fallisce e la URL richiesta non è in
 * cache, serviamo qualunque shell HTML disponibile. L'app è una SPA: una
 * qualsiasi shell basta a bootstrappare React, che poi gestisce il routing
 * client-side leggendo lo stato da localStorage.
 */
setCatchHandler(async ({ request }) => {
  if (request.mode === "navigate") {
    const cache = await caches.open(HTML_CACHE);
    for (const c of ["/", "/tournament"]) {
      const hit = await cache.match(c);
      if (hit) return hit;
    }
    const keys = await cache.keys();
    for (const key of keys) {
      const res = await cache.match(key);
      if (res) return res;
    }
  }
  return Response.error();
});
