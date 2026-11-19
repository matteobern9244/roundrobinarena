# Round Robin Arena — istruzioni per Claude Code

Web app (PWA) per tornei di ping pong all vs all, da 3 a 12 giocatori. Nessun backend: lo stato
vive in `localStorage` (`pp-tournament-v1`, tema in `pp-theme`). L'SSR produce solo l'HTML
iniziale.

## Stack

- TanStack Start 1.x (React 19, TanStack Router file-based), Vite 8, Nitro 3, Tailwind CSS 4.
- PWA con `vite-plugin-pwa` (strategia `injectManifest`, SW custom in `src/sw.ts`).
- Deploy su **Vercel** (preset Nitro `vercel`, scelto in automatico). Produzione da `main`,
  preview dagli altri branch.
- Test con Vitest; lint con ESLint 10 + Prettier.

## Ambiente

- **Node 26 LTS**: `nvm use` (legge `.nvmrc`) prima di ogni comando `node`, `npm`, `npx`.
- **npm** è l'unico package manager: niente Bun, pnpm o Yarn; il lockfile è `package-lock.json`.

## Comandi

```bash
npm run dev                        # sviluppo (SW disattivato)
npm run lint
npm run typecheck
npm test
npm run build                      # preset node-server → .output/
NITRO_PRESET=vercel npm run build  # riproduce l'output Vercel → .vercel/output/
node .output/server/index.mjs      # prova la build di produzione su http://localhost:3000
```

**Gate obbligatorio prima di ogni commit:** `lint` (zero errori), `typecheck`, `test`, `build`.

## File chiave

- `src/lib/tournament.ts` — dominio: algoritmo di Berger, classifica, punteggi (test accanto).
- `src/hooks/useTournament.ts`, `src/hooks/useTheme.ts`, `src/hooks/useHydrated.ts` — stato e
  lettura di API browser dopo l'idratazione.
- `src/routes/` — solo definizioni `Route` (`__root.tsx` con meta e link, `index.tsx`, `tournament.tsx`);
  i componenti delle pagine stanno in `src/components/` (`RootLayout`, `NotFoundComponent`,
  `setup/SetupPage`, `tournament/TournamentPage`).
- `src/sw.ts`, `src/pwa-register.ts` — Service Worker e registrazione.
- `vite.config.ts` — integrazione Nitro + PWA (leggere i commenti prima di toccarla).
- Documentazione: `docs/architecture.md`, `docs/tournament-logic.md`, `CHANGELOG.md`.

## Regole

- **PWA:** dopo modifiche a build, routing, `vite.config.ts` o SW verificare che `sw.js` sia
  nella cartella servita con il precache completo, che `/sw.js` risponda 200 e che il reload
  offline di `/` e `/tournament` funzioni (in locale o su preview Vercel).
- **React:** niente `setState` sincrono dentro `useEffect` (regola di react-hooks 7); per API
  browser usare `useSyncExternalStore` o `useHydrated`.
- **Versioni:** dipendenze all'ultima versione compatibile. Eccezioni dichiarate: TypeScript resta
  `~6.0` finché typescript-eslint non supporta la 7; `nitro` è in rc e resta a versione esatta.
- **Verifica:** le modifiche visibili si provano nel browser; il layout mobile in emulazione
  (360–430px). Simulatore iOS solo su richiesta di Matteo.
- **Lint pulito:** zero errori e zero avvisi. I file in `src/routes/` esportano solo `Route`; i
  componenti vanno in `src/components/` (regola `react-refresh/only-export-components`).
- Commit, push, merge su `main` e deploy di produzione solo su richiesta esplicita.
- Documenti (`README.md`, `docs/`, `CHANGELOG.md`, questo file) aggiornati insieme al codice.
