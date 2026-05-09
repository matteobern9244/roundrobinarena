# Architettura

Panoramica tecnica di **Round Robin Arena**.

## Stack

| Layer | Tecnologia |
|-------|------------|
| Framework | TanStack Start v1 (React 19) |
| Build | Vite 7 |
| Lingua | TypeScript (strict) |
| Styling | Tailwind CSS v4 (via `@import` in `src/styles.css`) |
| UI primitives | shadcn/ui + Radix UI |
| Routing | TanStack Router (file-based) |
| Persistenza | `localStorage` (no backend) |
| Deploy target | Cloudflare Workers (`wrangler.jsonc`) |
| Package manager | Bun |

Nessun backend, nessun database, nessuna autenticazione. Lovable Cloud non è abilitato.

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

Configurato in `vite.config.ts` con `VitePWA`:

| Risorsa | Strategia | Cache |
|---------|-----------|-------|
| Navigazioni HTML | `NetworkFirst` (timeout 3s) | `html` |
| JS / CSS / Worker | `StaleWhileRevalidate` | `assets` |
| Immagini / Font | `CacheFirst` (30 giorni) | `images-fonts` |

- `navigateFallback: /index.html` → SPA offline-friendly anche su deep link.
- `navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//]`.
- `registerType: "autoUpdate"` + prompt manuale "Nuova versione disponibile".
- `manifest: false` → si usa quello in `public/`.

### Registrazione condizionale

`src/pwa-register.ts` (`initPWA`) registra il SW **solo se**:

- non siamo in iframe (editor Lovable);
- l'hostname non è `id-preview--*` né `lovableproject.com`.

In quei casi fa anche `unregister()` di eventuali SW residui per evitare cache stantia nella preview.

### Componenti UI

- `src/components/OfflineBadge.tsx` — badge fisso "● OFFLINE" via eventi `online`/`offline`.
- `src/components/UpdatePrompt.tsx` — toast con bottone "Aggiorna" → `updateSW(true)` (skipWaiting + reload).

Entrambi montati in `RootComponent` (`src/routes/__root.tsx`).

### Test

Il SW è **disabilitato** in dev e nel preview Lovable. Per verificare offline:

1. Aprire il published URL (`https://roundrobinarena.lovable.app`).
2. DevTools → Application → Service Workers (verifica registrazione).
3. DevTools → Network → "Offline", ricarica.


## Build & deploy

```bash
bun run build
```

Output target: Cloudflare Workers (configurato in `wrangler.jsonc` + `@cloudflare/vite-plugin`).

Il progetto è pubblicato automaticamente da Lovable su `https://roundrobinarena.lovable.app`.
