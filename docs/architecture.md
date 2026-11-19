# Architettura

Panoramica tecnica di **Round Robin Arena**.

## Stack

| Layer | Tecnologia |
|-------|------------|
| Framework | TanStack Start v1 (React 19) |
| Build | Vite 8 + Nitro 3 (`nitro/vite`) |
| Lingua | TypeScript (strict) |
| Styling | Tailwind CSS v4 (via `@import` in `src/styles.css`) |
| Icone | lucide-react |
| Routing | TanStack Router (file-based) |
| Persistenza | `localStorage` (no backend) |
| Deploy target | Vercel (SSR come Vercel Function via preset Nitro `vercel`) |
| Runtime | Node.js 26 LTS (`.nvmrc`, `engines`) |
| Package manager | npm (`package-lock.json`) |
| Test | Vitest (`src/lib/tournament.test.ts`) |

Nessun backend, nessun database, nessuna autenticazione. Il rendering lato server serve solo a
produrre l'HTML iniziale: lo stato vive interamente nel browser.

## Routing

File-based routing in `src/routes/`:

- `__root.tsx` — root layout. Definisce `<html>`, `<head>` (meta SEO, OG, manifest PWA, icone, viewport con safe-area, script anti-FOUC del tema) e `<body>`. Espone anche il `notFoundComponent`.
- `index.tsx` — `/` setup torneo. Se trova uno stato salvato in `localStorage`, fa redirect automatico a `/tournament`.
- `tournament.tsx` — `/tournament` torneo attivo, con tab interne (Partite, Classifica, Giocatori).

Il file `src/routeTree.gen.ts` è auto-generato dal plugin Vite — non modificare a mano.

Il router è inizializzato in `src/router.tsx`.

## Stato applicativo

Lo stato del torneo è gestito dall'hook `useTournament` (`src/hooks/useTournament.ts`).

```
TournamentState = {
  players: string[]
  matches: Match[]
}
```

Tutto deriva da questi due array:
- I **round** sono ricostruiti da `players` + `matches` via `rebuildLiveRounds`.
- La **classifica** è derivata da `players` + `matches` via `computeStandings`.

Non c'è caching: ogni modifica di score scatena un re-render che ricalcola round e classifica → real-time gratis.

### API di `useTournament`

| Funzione | Effetto |
|----------|---------|
| `startTournament(players)` | Crea uno stato fresco con match generati. |
| `updateMatch(match)` | Sostituisce un match (usato quando cambiano gli score). |
| `resetMatches()` | Rigenera i match mantenendo i giocatori (azzera score). |
| `clearTournament()` | Cancella stato e `localStorage`. |
| `replacePlayers(players)` | Cambia rosa e rigenera tutto da zero. |
| `renamePlayers(oldNames, newNames)` | Rinomina mantenendo i punteggi (stessa lunghezza). |

Bandiera `savedFlash` resta a `true` per ~1.4s dopo ogni scrittura per il feedback "Salvato" nell'header.

## Persistenza

Chiave `localStorage`: `pp-tournament-v1`.

Lettura SSR-safe: `useTournament` legge solo dopo il mount (`useEffect`) per evitare problemi di idratazione.

In caso di JSON corrotto o quota piena, le funzioni di lettura/scrittura falliscono in silenzio e l'app continua a funzionare in memoria.

## Tema

Hook `useTheme` (`src/hooks/useTheme.ts`):

- Stati: `system | dark | light`.
- Default iniziale: `system` → risolto via `matchMedia('(prefers-color-scheme: dark)')`.
- Persistenza in `localStorage` come `pp-theme`.
- Inizializzazione SSR-safe: parte sempre con default `system / dark`, poi sincronizza dopo idratazione per evitare "null is not an object" su mobile.

Anti-FOUC: uno script blocking inline in `__root.tsx` legge `pp-theme` e applica la classe `dark` su `<html>` prima del primo paint.

Toggle UI: `src/components/ThemeToggle.tsx`. Presente sia in `/` (setup) sia in `/tournament` (header).

## Design system

`src/styles.css`:

- Token `oklch` per colori semantici (`--background`, `--foreground`, `--primary`, `--muted`, ecc.).
- Token neon arcade (`--neon-cyan`, `--neon-gold`, `--neon-lime`, ecc.).
- Glow shadows e gradienti riutilizzabili (`--glow-cyan`, `.standings-row.is-top`).
- Utility safe-area (`safe-x`, `safe-top`, `safe-bottom`) per iPhone notch.

**Regola**: non usare classi colore Tailwind dirette nei componenti. Sempre token semantici.

## PWA & Offline

- `public/manifest.webmanifest` (referenziato in `__root.tsx`).
- Icone `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `apple-touch-icon.png`, `favicon.ico`.
- Meta `apple-mobile-web-app-capable`, `mobile-web-app-capable`, status bar translucent.
- Viewport con `viewport-fit=cover` per safe-area iPhone.

### Service Worker (vite-plugin-pwa + Workbox)

SW custom in `src/sw.ts` (strategia `injectManifest`), configurato in `vite.config.ts`:

| Risorsa | Strategia | Cache |
|---------|-----------|-------|
| Asset della build (JS, CSS, icone, manifest) | precache Workbox | `workbox-precache-*` |
| Navigazioni HTML (`/`, `/tournament`) | `NetworkFirst` (timeout 3s) + prefetch delle shell all'install | `html-pages-v3` |
| Script / style / worker non in precache | `CacheFirst` (60 giorni) | `assets-v3` |
| Immagini / font | `CacheFirst` (60 giorni) | `images-fonts-v3` |

- L'app è SSR: non esiste un `/index.html` statico, quindi le shell HTML delle due rotte vengono
  scaricate e messe in cache dal SW; offline una navigazione ricade sulla shell in cache.
- `registerType: "autoUpdate"` + prompt manuale "Nuova versione disponibile".
- `manifest: false` → si usa `public/manifest.webmanifest`.

#### Integrazione con Nitro (vincoli in `vite.config.ts`)

1. Nitro scrive la build client nella cartella pubblica del preset (`.vercel/output/static` su
   Vercel, `.output/public` in locale). Il plugin PWA riceve questa cartella tramite
   `integration.beforeBuildServiceWorker`, altrimenti scriverebbe `sw.js` in `dist/` con un
   precache vuoto.
2. Il plugin di build PWA è limitato all'ambiente `client`: `sw.js` viene generato una sola
   volta, prima che Nitro registri dimensioni ed etag degli asset pubblici (altrimenti il server
   Node lo serve troncato).
3. `environments.client.build.copyPublicDir: true` porta `public/` nella build client, così icone
   e manifest entrano nel precache.

Dopo ogni modifica a build, routing o SW verificare: `sw.js` presente nella cartella servita,
precache con 13 voci circa (asset + icone + manifest), `/sw.js` risponde 200, reload offline ok.

### Registrazione condizionale

`src/pwa-register.ts` (`initPWA`) registra il SW **solo se**:

- siamo in build di produzione;
- non siamo in un iframe;
- l'URL non contiene `?sw=off` (kill switch).

Il SW è attivo sia in produzione sia nelle preview Vercel, che servono proprio a verificare
l'offline prima del rilascio. Nei contesti esclusi fa `unregister()` di eventuali SW residui.

### Componenti UI

- `src/components/OfflineBadge.tsx` — badge fisso "● OFFLINE" via eventi `online`/`offline`.
- `src/components/UpdatePrompt.tsx` — toast con bottone "Aggiorna" → `updateSW(true)` (skipWaiting + reload).

Entrambi montati in `RootComponent` (`src/routes/__root.tsx`).

### Test

Il SW è **disabilitato** in `npm run dev`. Per verificare offline:

1. In locale: `npm run build` e `node .output/server/index.mjs` (porta 3000), oppure su una
   preview Vercel.
2. DevTools → Application → Service Workers (verifica registrazione) e Cache Storage.
3. DevTools → Network → "Offline" (o server spento in locale), ricarica `/` e `/tournament`.


## Build & deploy

```bash
nvm use
npm ci
npm run build                      # preset Nitro node-server → .output/
NITRO_PRESET=vercel npm run build  # riproduce l'output Vercel → .vercel/output/
```

Su Vercel il preset `vercel` viene scelto in automatico. Progetto Vercel collegato al repository
GitHub: ogni push su `main` va in produzione, gli altri branch generano una preview.
