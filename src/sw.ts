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

const HTML_CACHE = "html-pages-v2";
const ASSET_CACHE = "assets-v2";
const IMG_CACHE = "images-fonts-v2";

// Rotte da pre-cachare interamente (HTML + tutti gli asset referenziati)
// così l'app funziona offline anche al primo refresh, sia su / che su /tournament.
const APP_SHELLS = ["/", "/tournament"];

// Precache statici dichiarati dalla build (best-effort).
precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

/**
 * Scarica una pagina HTML, la analizza ed estrae tutti gli URL same-origin
 * referenziati (script, stylesheet, modulepreload, prefetch, immagini),
 * poi cachea HTML + tutti gli asset insieme. Atomico per shell.
 */
async function precacheShell(path: string): Promise<void> {
  try {
    const res = await fetch(path, {
      cache: "reload",
      credentials: "same-origin",
    });
    if (!res || !res.ok) return;

    const htmlCache = await caches.open(HTML_CACHE);
    await htmlCache.put(path, res.clone());

    const html = await res.text();
    const origin = self.location.origin;
    const urls = new Set<string>();

    // Match src="..." e href="..." per script/link
    const attrRe = /(?:src|href)\s*=\s*["']([^"']+)["']/gi;
    let m: RegExpExecArray | null;
    while ((m = attrRe.exec(html)) !== null) {
      const raw = m[1];
      if (!raw) continue;
      // Solo same-origin o relativi
      try {
        const u = new URL(raw, origin);
        if (u.origin !== origin) continue;
        // Ignora HTML/route URL e ancore
        if (u.pathname.endsWith(".html")) continue;
        if (raw.startsWith("#")) continue;
        // Ignora endpoint server
        if (u.pathname.startsWith("/api/")) continue;
        if (u.pathname.startsWith("/~")) continue;
        urls.add(u.pathname + u.search);
      } catch {
        /* skip */
      }
    }

    // Cachea tutti gli asset in parallelo (best-effort, non bloccare se uno fallisce)
    const assetCache = await caches.open(ASSET_CACHE);
    const imgCache = await caches.open(IMG_CACHE);
    await Promise.allSettled(
      Array.from(urls).map(async (u) => {
        try {
          const r = await fetch(u, { cache: "reload", credentials: "same-origin" });
          if (!r || !(r.ok || r.type === "opaque")) return;
          // Distingui immagini/font da JS/CSS in base all'estensione
          const isImg = /\.(png|jpg|jpeg|gif|svg|webp|avif|ico|woff2?|ttf|otf|eot)$/i.test(u);
          const target = isImg ? imgCache : assetCache;
          await target.put(u, r.clone());
        } catch {
          /* offline o errore singolo asset: ignora */
        }
      }),
    );
  } catch {
    /* offline al momento dell'install: ignora */
  }
}

self.addEventListener("install", (event) => {
  // Attiva subito il nuovo SW senza aspettare chiusura tab.
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      // Pre-cachea le shell principali con i loro asset.
      await Promise.all(APP_SHELLS.map((p) => precacheShell(p)));
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      // Pulisci cache vecchie con nomi diversi.
      const keep = new Set([HTML_CACHE, ASSET_CACHE, IMG_CACHE]);
      const names = await caches.keys();
      await Promise.all(
        names.map((n) => {
          if (!keep.has(n) && !n.startsWith("workbox-")) {
            return caches.delete(n);
          }
          return Promise.resolve();
        }),
      );
      // Ri-prefetcha le shell anche su activate, in caso install fosse offline.
      await Promise.all(APP_SHELLS.map((p) => precacheShell(p)));
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

// JS / CSS / Worker → CacheFirst (sono hashati: il contenuto non cambia mai
// per uno stesso URL, quindi cache-first è sicuro e garantisce offline).
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
 * la cache ha quella URL specifica, restituisci la shell di "/" (o la prima
 * HTML disponibile). L'app è una SPA: una qualsiasi shell HTML basta a
 * bootstrappare React, che poi gestisce il routing client-side da localStorage.
 */
setCatchHandler(async ({ request }) => {
  if (request.mode === "navigate") {
    const cache = await caches.open(HTML_CACHE);
    const candidates = [
      "/",
      new URL("/", self.location.origin).toString(),
      "/tournament",
    ];
    for (const c of candidates) {
      const hit = await cache.match(c);
      if (hit) return hit;
    }
    // Fallback finale: prima HTML qualsiasi.
    const keys = await cache.keys();
    for (const key of keys) {
      const res = await cache.match(key);
      if (res) return res;
    }
  }
  return Response.error();
});
