/// <reference lib="webworker" />
/* eslint-disable @typescript-eslint/no-explicit-any */
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute, setCatchHandler } from "workbox-routing";
import {
  NetworkFirst,
  StaleWhileRevalidate,
  CacheFirst,
} from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";

declare const self: ServiceWorkerGlobalScope;

const HTML_CACHE = "html-pages";
const ASSET_CACHE = "assets";
const IMG_CACHE = "images-fonts";

// Precache statici (asset hashati prodotti dalla build)
precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

self.addEventListener("install", () => {
  // Aspetta il messaggio SKIP_WAITING per attivarsi (gestito da updatePrompt).
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      // Pre-warm: scarica e cachea "/" così l'app è subito disponibile offline
      // anche se l'utente non ha ancora navigato di nuovo.
      try {
        const cache = await caches.open(HTML_CACHE);
        const res = await fetch("/", { cache: "reload" });
        if (res && (res.ok || res.type === "opaque")) {
          await cache.put("/", res.clone());
        }
      } catch {
        /* offline o errore: ignora */
      }
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

// JS / CSS / Worker → StaleWhileRevalidate.
registerRoute(
  ({ request }) =>
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "worker",
  new StaleWhileRevalidate({
    cacheName: ASSET_CACHE,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 }),
    ],
  }),
);

// Immagini / font → CacheFirst.
registerRoute(
  ({ request }) =>
    request.destination === "image" || request.destination === "font",
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
 * Fallback offline: se NetworkFirst fallisce per una navigazione e nemmeno
 * la cache ha quella URL, prova a restituire QUALSIASI HTML cachata
 * (l'app è una SPA: una qualsiasi shell HTML basta a bootstrappare React,
 * che poi gestisce il routing client-side da localStorage).
 */
setCatchHandler(async ({ request }) => {
  if (request.mode === "navigate") {
    const cache = await caches.open(HTML_CACHE);
    // Prova prima la root.
    const root =
      (await cache.match("/")) ||
      (await cache.match(new URL("/", self.location.origin).toString()));
    if (root) return root;
    // Altrimenti la prima HTML disponibile.
    const keys = await cache.keys();
    for (const key of keys) {
      const res = await cache.match(key);
      if (res) return res;
    }
  }
  return Response.error();
});
