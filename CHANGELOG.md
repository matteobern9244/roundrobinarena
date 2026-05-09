# Changelog

Tutte le modifiche significative di **Round Robin Arena** sono elencate in questo file.

Il formato segue [Keep a Changelog](https://keepachangelog.com/it/1.1.0/) e la versione adotta [Semantic Versioning](https://semver.org/lang/it/).

## [Unreleased]

### Discusso ma non ancora applicato
- Riduzione di `MIN_PLAYERS` da 3 a 2 in `src/lib/tournament.ts`. Al momento il limite minimo nel codice resta **3**.

---

## [0.6.0] — 2026-05-09

### Added
- **Supporto offline completo (PWA)** tramite `vite-plugin-pwa` + Workbox.
  - Service Worker con `registerType: "autoUpdate"` che cachea HTML, JS, CSS, immagini, font e icone alla prima visita.
  - Strategie di caching: `NetworkFirst` per le navigazioni HTML (timeout 3s), `StaleWhileRevalidate` per script/style, `CacheFirst` per immagini e font.
  - SPA fallback (`navigateFallback: /index.html`) per far funzionare i deep link offline.
  - Registrazione condizionale in `src/pwa-register.ts`: il SW NON parte dentro l'editor Lovable (iframe / host `id-preview--*` / `lovableproject.com`) ed eventuali SW residui vengono disattivati per mantenere fresca la preview.
- **`OfflineBadge`** (`src/components/OfflineBadge.tsx`): badge neon "● OFFLINE" in alto al centro quando manca connessione, ascolta gli eventi `online` / `offline`.
- **`UpdatePrompt`** (`src/components/UpdatePrompt.tsx`): toast neon in basso "⚡ Nuova versione disponibile · Aggiorna" mostrato quando Workbox segnala un nuovo SW pronto; il click applica `updateSW(true)` e ricarica.
- `vite-plugin-pwa/client` aggiunto ai `types` di `tsconfig.json` per il modulo virtuale `virtual:pwa-register`.

### Notes
- Lo stato torneo era già 100% offline-capable (tutto in `localStorage` con chiave `pp-tournament-v1`): l'aggiornamento copre solo la disponibilità degli asset statici.
- Il comportamento offline è verificabile **solo sul published URL** (`https://roundrobinarena.lovable.app`) o tramite Share Preview: nell'editor il SW è disabilitato di proposito.

---

## [0.5.0] — 2026-04-27

### Added
- **Sistema temi dual** (dark/light arcade) in `src/hooks/useTheme.ts` e `src/components/ThemeToggle.tsx`.
  - Stati: `system` (default), `dark`, `light`.
  - Persistenza in `localStorage` con chiave `pp-theme`.
  - Tema light arcade che mantiene i colori vividi neon.
  - Toggle disponibile sia nella pagina di setup sia nell'header del torneo.
- **Anti-FOUC**: script blocking inline in `src/routes/__root.tsx` che applica la classe `dark` su `<html>` prima del primo paint.
- Memoria progetto `mem://design/theme-system` per documentare le scelte.

### Fixed
- **Hydration error** ("null is not an object (evaluating 'dispatcher.useContext')") che si verificava su mobile con tema "Sistema": l'hook `useTheme` ora inizializza con default SSR-safe (`system` / `dark`) e sincronizza `localStorage` / `matchMedia` solo dopo l'idratazione tramite `useEffect`.

---

## [0.4.0] — 2026-04-27

### Changed
- **Pagina Classifica** ridisegnata mobile-first per matchare il wireframe richiesto:
  - Tabella compatta sempre visibile (anche su mobile), con colonne `#`, Giocatore, G, V, P, PF, PS, +/−.
  - Font `text-[9px]` su mobile + `tabular-nums` per allineamento numeri.
  - Griglia card giocatore in **2 colonne fisse** su mobile e desktop.
  - Bordo card colorato per giocatore; gradiente oro + glow per il primo in classifica.
  - Mini-stat Vinte/Perse/PF + barra progress win rate centrata.
  - Padding compatti `p-3 sm:p-4` e safe-area per iPhone.
- Real-time confermato: la classifica si ricalcola via `computeStandings` ad ogni `updateMatch` senza caching intermedio.

---

## [0.3.0]

### Added
- **Tab "Giocatori"** nella pagina torneo: rinomina partecipanti mantenendo i punteggi tramite `renamePlayers` in `useTournament`.
- **Champion banner** mostrato in cima alla classifica quando tutti i match sono completati.
- **Flash "Salvato"** dopo ogni persistenza in `localStorage`.

### Changed
- Ordinamento classifica: vittorie → differenza punti (PF − PS) → punti fatti.

---

## [0.2.0]

### Added
- **Algoritmo round-robin di Berger** in `src/lib/tournament.ts` (`generateRounds`):
  - Numeri pari di giocatori → `N-1` turni senza riposo.
  - Numeri dispari → `N` turni con uno slot `BYE` che fa riposare un giocatore per turno.
  - ID match stabili e indipendenti dall'ordine (`r{round}-{playerA}__{playerB}` ordinati alfabeticamente).
- **Persistenza** dello stato torneo in `localStorage` (`pp-tournament-v1`).
- **Color palette** giocatori (8 colori predefiniti, assegnati per posizione nella rosa) + medaglie 🥇🥈🥉.

---

## [0.1.0] — Bootstrap

### Added
- Setup TanStack Start v1 + React 19 + Vite 7 + Tailwind v4.
- File-based routing con `src/routes/__root.tsx`, `index.tsx`, `tournament.tsx`.
- shadcn/ui + Radix primitives.
- PWA: `manifest.webmanifest`, icone 192/512, apple-touch-icon, meta `apple-mobile-web-app-*`.
- Meta SEO + Open Graph in `__root.tsx` (`Round Robin Arena manages tournament brackets...`).
- 404 personalizzato e shell HTML con safe-area per iPhone.
- Setup giocatori (3–8) con preview turni/partite e validazione.
- Pagina torneo con tab Partite + Classifica.
- Punteggio massimo `WIN_SCORE = 11`; calcolo vincitore automatico quando uno score raggiunge 11.
