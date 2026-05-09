## Obiettivo

Rendere Round Robin Arena completamente utilizzabile offline: dopo il primo caricamento online, l'app deve avviarsi, navigare e gestire i tornei senza connessione. I dati sono già 100% in `localStorage`, quindi serve solo cachare gli asset statici (HTML/JS/CSS/font/icone).

## Cosa cambierà

### 1. Dipendenza
- Aggiungere `vite-plugin-pwa` come devDependency.

### 2. `vite.config.ts`
Configurare `VitePWA` con:
- `registerType: "autoUpdate"` — aggiornamenti silenziosi quando esce una nuova build.
- `devOptions: { enabled: false }` — il SW NON parte in dev/preview Lovable (evita cache stantia nell'editor).
- `workbox.navigateFallback: "/index.html"` per SPA fallback offline.
- `workbox.navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//]`.
- `workbox.runtimeCaching`:
  - HTML navigations → `NetworkFirst` (cache `html`, timeout 3s).
  - JS/CSS/worker → `StaleWhileRevalidate` (cache `assets`).
  - Immagini/icone/font → `CacheFirst` (cache `images`, max 60 entries, 30 giorni).
- `manifest: false` — manteniamo il `manifest.webmanifest` esistente in `public/`.
- `includeAssets`: favicon, apple-touch-icon, icone PNG.

### 3. Registrazione del Service Worker
Nuovo modulo `src/pwa-register.ts` che:
- Importa `registerSW` da `virtual:pwa-register`.
- Esegue **solo se** non siamo in iframe e non siamo su host preview Lovable (`id-preview--*`, `lovableproject.com`).
- Negli host preview/iframe, fa `unregister()` di eventuali SW residui per pulizia.

Importato una sola volta da `src/router.tsx` (lato client).

### 4. UI: indicatore stato offline + update disponibile
- Nuovo componente `src/components/OfflineBadge.tsx`: piccolo badge in header che ascolta `online`/`offline` e mostra "OFFLINE" con stile neon quando manca rete.
- Nuovo componente `src/components/UpdatePrompt.tsx`: toast non invasivo "Nuova versione disponibile · Aggiorna" quando `registerSW` segnala `onNeedRefresh`. Cliccando ricarica.
- Entrambi montati nel layout root (`__root.tsx` → `RootComponent`).

### 5. TypeScript
- Aggiungere `vite-plugin-pwa/client` ai `types` di `tsconfig.json` per il modulo virtuale `virtual:pwa-register`.

### 6. Documentazione
- `README.md`: nuova sezione "Offline / PWA" con istruzioni (installabile da home, funziona offline dopo primo caricamento, testabile solo su URL pubblicato).
- `CHANGELOG.md`: voce `## [0.6.0]` — Supporto offline completo via Service Worker.
- `docs/architecture.md`: sottosezione PWA aggiornata (strategia di caching, registrazione condizionale, badge offline).

## Note tecniche

- Il SW viene registrato solo in produzione, quindi nell'editor Lovable non vedrai il comportamento offline: va testato sul **published URL** (`roundrobinarena.lovable.app`) o tramite "Share preview".
- Lo stato torneo è già persistente in `localStorage` → nessuna modifica alla logica di dominio.
- Nessun backend coinvolto: l'app rimane 100% client-side.
- Manifest esistente già configurato (`display: standalone`, icone, theme color) → installabile su iOS/Android senza modifiche.

## File toccati

- `package.json` (nuova dep)
- `vite.config.ts`
- `tsconfig.json`
- `src/router.tsx`
- `src/pwa-register.ts` (nuovo)
- `src/components/OfflineBadge.tsx` (nuovo)
- `src/components/UpdatePrompt.tsx` (nuovo)
- `src/routes/__root.tsx`
- `README.md`, `CHANGELOG.md`, `docs/architecture.md`