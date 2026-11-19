# Piano — Migrazione da Lovable a Vercel e tech refresh

Data: 2026-11-19 · Branch di lavoro: `develop` · Stato: **completato** (default D1–D6) — vedi "Esecuzione" in fondo

Obiettivo: portare Round Robin Arena da Lovable (Cloudflare Workers) a Vercel, aggiornare tutte le
dipendenze all'ultima versione compatibile e fissare Node.js all'ultima LTS (**26.x**, oggi 26.13.1).
Il progetto su Lovable è già stato depubblicato.

---

## 1. Fotografia attuale

| Area            | Oggi                                                             | Note                                                                                                                                                                                  |
| --------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework       | TanStack Start 1.16x, React 19.2, Vite 7.3                       | SSR, routing a file (`/`, `/tournament`)                                                                                                                                              |
| Build           | `@lovable.dev/vite-tanstack-config` 2.9.1                        | Wrapper che aggiunge tanstackStart, react, tailwind, tsconfig-paths, alias `@`, dedupe, iniezione `VITE_*` e **Nitro con preset `cloudflare-module`** (asset client in `dist/client`) |
| Deploy          | Cloudflare Workers (`wrangler.jsonc`, `@cloudflare/vite-plugin`) | Pubblicato da Lovable su `roundrobinarena.lovable.app` (ora offline)                                                                                                                  |
| Backend         | Nessuno                                                          | Tutto in `localStorage` (`pp-tournament-v1`); nessuna env var                                                                                                                         |
| PWA             | `vite-plugin-pwa` 1.x, SW custom `src/sw.ts` (injectManifest)    | `outDir: "dist/client"` legato al layout Cloudflare; guardie host Lovable in `src/pwa-register.ts`                                                                                    |
| Package manager | **Due lockfile**: `bun.lockb` + `package-lock.json`              | Da ridurre a uno                                                                                                                                                                      |
| Node            | Nessun `.nvmrc`, nessun `engines`                                | `@types/node` 22                                                                                                                                                                      |
| Qualità         | `eslint`, `prettier`; **nessun test, nessuno script typecheck**  |                                                                                                                                                                                       |

**Scoperta rilevante:** il codice dell'app non importa **nessuno** dei 48 componenti in
`src/components/ui/` (shadcn). Gli unici pacchetti usati a runtime sono `react`,
`@tanstack/react-router`, `clsx` + `tailwind-merge` (via `cn` in `ThemeToggle`), `lucide-react`
(`Moon`, `Sun`), `tw-animate-css` (CSS) e `workbox-*` (nel SW). Anche `src/hooks/use-mobile.tsx`
serve solo a `ui/sidebar`.

---

## 2. Decisioni da prendere (con default consigliato)

| #   | Decisione                                   | Default consigliato                                                                                                               | Alternativa                                                                |
| --- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| D1  | Componenti shadcn e dipendenze inutilizzate | **Rimuoverli** (≈48 file, ≈40 pacchetti): spariscono i major di zod 4, recharts 3, react-day-picker 10, @hookform/resolvers 7     | Tenerli e aggiornarli tutti (lavoro su codice morto)                       |
| D2  | Rendering su Vercel                         | **SSR con Nitro preset `vercel`** (stessa architettura di oggi, SW invariato)                                                     | Prerender statico delle 2 rotte: niente funzioni, ma va riverificato il SW |
| D3  | Package manager                             | **npm** (coerente con nvm/Node 26; via `bun.lockb` e `bunfig.toml`)                                                               | Bun (via `package-lock.json`)                                              |
| D4  | Progetto Vercel                             | Nome `roundrobinarena`, team personale, **production branch `main`**, preview da `develop`                                        | Altri nomi/team; dominio custom                                            |
| D5  | Service Worker                              | **Attivo in produzione e nelle preview Vercel** (serve per provare l'offline prima del rilascio), kill switch `?sw=off` mantenuto | Solo produzione                                                            |
| D6  | Rete di sicurezza                           | **Aggiungere Vitest con test su `src/lib/tournament.ts`** (Berger, classifica) prima del refresh                                  | Solo lint + typecheck + build + browser                                    |

---

## 3. Fasi

Ogni fase si chiude con le sue prove; nessuna fase parte se la precedente non è verde.
Prove standard (d'ora in poi "**gate**"): `nvm use` → `npm run lint` → `npm run typecheck` →
`npm run build` (+ `npm test` se D6) e controllo nel browser.

### Fase 0 — Baseline su Node 26

1. Creare `.nvmrc` con `26` e aggiungere a `package.json` `"engines": { "node": "26.x" }`
   (Vercel usa `engines` per scegliere l'ultima 26.x).
2. Aggiungere lo script `"typecheck": "tsc --noEmit"`.
3. `npm ci` con il lockfile attuale, poi lint, typecheck, build: **registrare l'esito** come baseline
   (errori preesistenti annotati, non corretti di nascosto).
4. (D6) Installare Vitest e scrivere i test di `tournament.ts`: N pari/dispari, numero turni,
   partite totali `N·(N-1)/2`, riposo, ordinamento classifica, vincitore a 11.

5. Creare `CLAUDE.md` nella radice del progetto (in italiano, breve), con:
   - descrizione dell'app e stack (TanStack Start + React 19, Tailwind 4, PWA, nessun backend,
     dati in `localStorage`; deploy Vercel via Nitro);
   - Node 26 con `nvm use` (da `.nvmrc`) prima di ogni comando npm/npx; npm come unico package manager;
   - comandi: `dev`, `build`, `preview`, `lint`, `typecheck`, `test` (se D6), `format`;
   - gate obbligatorio prima di ogni commit: lint + typecheck + test + build;
   - mappa dei file chiave (`src/lib/tournament.ts`, `src/hooks/useTournament.ts`, `src/sw.ts`,
     `src/pwa-register.ts`, `vite.config.ts`) e rimando a `docs/architecture.md` e
     `docs/tournament-logic.md`;
   - regole PWA: verificare sempre che `/sw.js` sia servito e che l'offline funzioni dopo modifiche
     a build, routing o SW; verifica offline su preview Vercel;
   - verifica nel browser per modifiche visibili, layout mobile in emulazione; simulatore iOS solo
     su richiesta;
   - regola sulle versioni: dipendenze all'ultima versione compatibile, eccezioni dichiarate
     (TypeScript < 6.1 per typescript-eslint, nitro in rc a versione esatta);
   - commit, push, merge e deploy di produzione solo su richiesta; documenti aggiornati insieme al
     codice.
     Le sezioni su Vercel e versioni si completano in fase 5, quando sono verificate.

Prova: gate verde (o differenze rispetto alla baseline motivate).

### Fase 1 — Pulizia del codice morto (se D1)

1. Eliminare `src/components/ui/*`, `src/hooks/use-mobile.tsx`.
2. Rimuovere da `package.json` tutti i `@radix-ui/*`, `@hookform/resolvers`, `react-hook-form`, `zod`,
   `cmdk`, `date-fns`, `react-day-picker`, `embla-carousel-react`, `input-otp`, `recharts`,
   `react-resizable-panels`, `sonner`, `vaul`, `class-variance-authority`, `@tanstack/react-query`
   (da confermare con `grep` prima di ogni rimozione).
3. `components.json` resta solo se si vuole poter riaggiungere componenti shadcn in futuro.

Prova: gate verde, l'app si comporta come prima (setup → torneo → classifica → reset).

### Fase 2 — Sgancio da Lovable e Cloudflare (sulle versioni attuali)

Scopo: cambiare **solo** la piattaforma, senza aggiornamenti in mezzo, per isolare i problemi.

1. `vite.config.ts` esplicito, senza wrapper:
   `tanstackStart()`, `nitro()` (preset `vercel`, rilevato in automatico su Vercel),
   `viteReact()`, `tailwindcss()`, `tsConfigPaths()`, `VitePWA(...)`.
   Alias `@` coperto da tsconfig-paths; dedupe di react/react-dom solo se serve.
   Nessuna iniezione `VITE_*` necessaria (l'app non ha env var).
2. Rimuovere `@lovable.dev/vite-tanstack-config`, `@cloudflare/vite-plugin`, `wrangler.jsonc`,
   `bun.lockb`, `bunfig.toml`; rigenerare `package-lock.json` (D3). Rinominare il pacchetto
   (`"name": "roundrobinarena"`).
3. PWA: la cartella `dist/client` era imposta dal preset Cloudflare. Con Nitro/Vercel l'output
   statico finisce altrove (presumibilmente `.vercel/output/static`, **da verificare in build**):
   adeguare `outDir` del plugin PWA o lasciarlo derivare dalla build client.
   **Gate PWA obbligatorio:** `sw.js` presente nella cartella servita, manifest di precache non vuoto.
4. `src/pwa-register.ts`: togliere le guardie host Lovable (`lovableproject.com`, `lovable.dev`, …);
   mantenere iframe e `?sw=off` (D5). Aggiornare il commento in `vite.config.ts`.
5. Aggiungere `.vercel` a `.gitignore`; togliere le voci Wrangler.
6. Build locale con preset Vercel (`NITRO_PRESET=vercel npm run build`) e `npm run preview`
   o `vercel build` + `vercel dev` per provare l'app in locale.

Prova: gate verde; output `.vercel/output` con funzione SSR e statici; `sw.js` nel posto giusto.

### Fase 3 — Progetto Vercel e prima preview

Ogni azione su Vercel/GitHub richiede il via di Matteo.

1. Creare il progetto Vercel collegato a `github.com/matteobern9244/roundrobinarena`
   (dashboard o MCP Vercel), framework TanStack Start rilevato, Node 26.x, production branch `main`.
2. Se l'integrazione GitHub di Lovable è ancora collegata al repository, scollegarla
   (Lovable → Project → GitHub, e GitHub → Settings → Applications).
3. Push di `develop` (su richiesta) → preview deployment.
4. Verifiche sulla preview, nel browser:
   - `/` e `/tournament` rispondono 200 anche a freddo (SSR); deep link e refresh ok;
   - `/sw.js` e `/manifest.webmanifest` rispondono 200 con il content-type giusto;
   - SW registrato, precache popolata, **reload offline funzionante** (DevTools → Offline);
   - temi dark/light, badge OFFLINE, toast "Nuova versione disponibile" dopo un secondo deploy;
   - layout mobile in emulazione browser (360–430px).
   - Se la Deployment Protection delle preview è attiva, provare da browser autenticato.
   - Prova su iPhone reale / simulatore iOS **solo se Matteo lo chiede**.

### Fase 4 — Tech refresh, a gruppi legati dalle peer dependency

Un gruppo alla volta, gate completo dopo ciascuno, preview Vercel dopo 4a e 4b.

**4a — Toolchain di build** (vanno insieme: `@tanstack/react-start` ultima richiede `vite >= 8`,
`@vitejs/plugin-react` 6 richiede `vite ^8`)

| Pacchetto                                            | Da              | A                                                           |
| ---------------------------------------------------- | --------------- | ----------------------------------------------------------- |
| vite                                                 | 7.3             | 8.3.x                                                       |
| @vitejs/plugin-react                                 | 5.x             | 6.3.x                                                       |
| @tanstack/react-start · react-router · router-plugin | 1.16x           | ultime 1.x                                                  |
| nitro                                                | 3.0.260603-beta | **3.0.261103-rc, versione esatta** (non esiste una stabile) |
| tailwindcss · @tailwindcss/vite                      | 4.2             | 4.3.x                                                       |
| vite-tsconfig-paths                                  | 6.0             | 6.1.x (o supporto nativo dei path di Vite 8, se verificato) |

Rischio: Vite 8 passa a Rolldown; controllare plugin PWA e dimensioni bundle.

**4b — PWA**

| vite-plugin-pwa | 1.x | 2.0.x (ora richiede `workbox-build` come peer: aggiungerlo) |
| workbox-* | 7.4.1 | già ultime |

Rifare per intero le verifiche PWA della fase 3.

**4c — Lint e TypeScript**

| Pacchetto                                                  | Da   | A                                                                           |
| ---------------------------------------------------------- | ---- | --------------------------------------------------------------------------- |
| eslint · @eslint/js                                        | 9    | 10                                                                          |
| typescript-eslint                                          | 8.56 | 8.73.x                                                                      |
| typescript                                                 | 5.8  | **6.0.3** — _non_ 7.x: typescript-eslint accetta solo `<6.1.0`              |
| eslint-plugin-react-hooks                                  | 5    | 7 (nuove regole stile React Compiler: possibili segnalazioni da correggere) |
| eslint-plugin-react-refresh                                | 0.4  | 0.5                                                                         |
| globals                                                    | 15   | 17                                                                          |
| prettier · eslint-config-prettier · eslint-plugin-prettier | —    | ultime                                                                      |
| @types/node                                                | 22   | 26                                                                          |

**4d — Runtime rimanente**

| react · react-dom | 19.2 | 19.3.x |
| lucide-react | 0.575 | 1.x (`Moon` e `Sun` restano) |
| clsx · tailwind-merge · tw-animate-css | — | ultime |

Se D1 = "tenerli": aggiungere qui zod 4, recharts 3, react-day-picker 10, @hookform/resolvers 7
e l'aggiornamento dei relativi componenti shadcn.

Chiusura: `npm outdated` vuoto salvo le eccezioni dichiarate (TypeScript 7, nitro rc);
`npm audit` senza vulnerabilità alte.

### Fase 5 — Documentazione

- `README.md`: URL live Vercel, stack (Vercel + Nitro, npm, Node 26), comandi `npm`, rimozione
  riferimenti Lovable/Bun/Cloudflare, rimando a questo piano.
- `docs/architecture.md`: deploy target, package manager, sezione PWA/offline (verifica su preview
  e produzione Vercel), build.
- `CHANGELOG.md`: voce della migrazione e del refresh.
- `CLAUDE.md`: allineato allo stato finale (URL, versioni effettive, eccezioni, comandi verificati).
- `.lovable/`: spostare il piano storico in `docs/` o eliminarlo.
- Commenti di `vite.config.ts` aggiornati.

### Fase 6 — Rilascio in produzione

1. Merge `develop` → `main` (su richiesta) → production deployment.
2. Ripetere le verifiche della fase 3 sull'URL di produzione (`roundrobinarena.vercel.app`
   o dominio custom).
3. Comunicare agli utenti:
   - **i tornei salvati su `lovable.app` non migrano**: `localStorage` è legato all'origine;
   - la PWA installata dal vecchio URL va rimossa e reinstallata dal nuovo.

---

## 4. Rischi principali

| Rischio                                                                  | Mitigazione                                                                            |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `sw.js` non servito o in cartella sbagliata (già successo su Cloudflare) | Gate PWA in fase 2, 3 e 4b; nessuna ipotesi sul percorso finché la build non lo mostra |
| Vite 8 / Rolldown rompe un plugin                                        | 4a isolata, preview dedicata                                                           |
| nitro ancora in rc                                                       | Versione esatta nel `package.json`, lockfile committato                                |
| Nuove regole react-hooks 7                                               | Correzioni puntuali, mai disattivare regole per far passare il lint                    |
| Lovable che riscrive il repo via sync GitHub                             | Scollegare l'integrazione in fase 3                                                    |

## 5. Autorizzazioni richieste a Matteo

Commit, push, merge su `main`, creazione e configurazione del progetto Vercel, collegamento del
repository, deploy di produzione e prove sul simulatore iOS: ognuno solo su richiesta esplicita.

---

## 6. Esecuzione (2026-11-19)

Tutte le fasi completate. Produzione: <https://roundrobinarena.vercel.app> (progetto Vercel
`roundrobinarena`, Node 26.x, framework TanStack Start, production branch `main`).

Verifiche:

- Locale (`node .output/server/index.mjs`): SW attivo, precache 13 voci, avvio torneo,
  punteggio salvato e ripristinato dopo il reload, tema chiaro persistente, `/` e `/tournament`
  aperti dalla cache a server spento.
- Vercel: build con runtime `nodejs26.x` e preset `vercel`; in produzione `/sw.js` 200
  (`cache-control: public, max-age=0, must-revalidate`), SW attivo, precache 13 voci, shell HTML
  in cache, `/tournament` 200, rotta inesistente 404, layout mobile 375px corretto.
- Protezione Vercel impostata su "Standard" (`prod_deployment_urls_and_all_previews`): il dominio
  di produzione è pubblico, preview e URL dei singoli deploy richiedono il login Vercel.
- Il primo deploy, creato via API da `develop`, è stato assegnato alla produzione; `main` è stato
  poi portato in fast-forward sullo stesso commit e ridistribuito.

Scostamenti dal piano:

- **Baseline:** `package-lock.json` era disallineato (Lovable installava con Bun), quindi la
  baseline è stata misurata con `bun install --frozen-lockfile`: typecheck e build verdi, lint con
  16 errori di formattazione Prettier e 8 avvisi già presenti.
- **Fasi 2 e 4a unite:** con npm le versioni di TanStack Start nel range esistente richiedono già
  Vite 8, quindi sgancio da Lovable e aggiornamento della toolchain sono avvenuti insieme.
- **Service Worker:** la cartella servita su Vercel è `.vercel/output/static` (in locale
  `.output/public`). Soluzione in `vite.config.ts`, descritta in `docs/architecture.md`.
- **Correzioni richieste dalle nuove regole di lint:** `useTournament`, `useTheme`,
  `OfflineBadge`, `pwa-register.ts`; componente d'errore del router per TanStack Router recente.
- **Non verificato:** offline su iPhone reale o simulatore iOS (solo su richiesta).
- **Avvisi accettati:** `react-refresh/only-export-components` sui file di rotta (13) e su
  `src/router.tsx`; 4 vulnerabilità moderate di `npm audit` in `glob`/`minimatch`, solo build-time
  tramite `workbox-build`, senza correzione compatibile a monte.
- **`.lovable/`** archiviata in `docs/archivio/`.
