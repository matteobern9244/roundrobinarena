# 🏓 Round Robin Arena — Ping Pong Tournament

Web app per gestire un torneo di ping pong **all vs all** (round-robin) da 3 a 8 giocatori, con classifica live, gestione automatica dei numeri dispari (turno di riposo) e tema arcade neon dark/light.

> Tutto gira nel browser. Nessun account, nessun backend: i dati restano in `localStorage` sul tuo dispositivo.

**Live**: https://roundrobinarena.lovable.app

---

## ✨ Features

- **Setup torneo** con 3–8 giocatori (default: 6 nomi precompilati, modificabili).
- **Generazione round-robin** automatica con algoritmo di Berger:
  - N pari → `N-1` turni, `N/2` partite per turno, nessuno riposa.
  - N dispari → `N` turni, `(N-1)/2` partite per turno, **un giocatore riposa** ogni turno.
  - Totale partite sempre `N·(N-1)/2`.
- **Partita a 11 punti secchi** (`WIN_SCORE = 11`): il vincitore viene determinato automaticamente quando uno dei due score raggiunge 11.
- **Classifica real-time**: aggiorna istantaneamente vittorie, sconfitte, punti fatti/subiti e differenza punti a ogni modifica di score.
- **Ordinamento classifica**: vittorie → differenza punti → punti fatti.
- **Champion banner** quando il torneo è completo.
- **3 viste a tab**: Partite · Classifica · Giocatori.
- **Rinomina giocatori a torneo in corso** mantenendo i punteggi.
- **Reset partite** (azzera i punteggi mantenendo la rosa) o **chiusura torneo** (torna al setup).
- **Persistenza automatica** in `localStorage` (`pp-tournament-v1`) con flash "Salvato".
- **Tema dual**: dark arcade (neon) + light arcade (colori vividi mantenuti). Default = sistema operativo. Toggle disponibile sia nel setup sia nell'header del torneo.
- **PWA-ready**: manifest, icone, meta `apple-mobile-web-app`, viewport con safe-area per iPhone.
- **Mobile-first**: layout pensato per 360–430px, scala fino a desktop senza modifiche.

---

## 🛠️ Stack tecnologico

- **TanStack Start v1** (React 19 + Vite 7) con file-based routing.
- **TypeScript strict**.
- **Tailwind CSS v4** via `@import` in `src/styles.css` con design tokens `oklch`.
- **shadcn/ui** + **Radix UI** primitives.
- **Cloudflare Workers** come target di deploy (vedi `wrangler.jsonc`).
- **Bun** come package manager.

Nessun backend richiesto. Lovable Cloud non è abilitato: tutto avviene client-side.

---

## 📂 Struttura del progetto

```
src/
├── routes/
│   ├── __root.tsx          # Shell HTML, head meta, PWA, anti-FOUC theme script
│   ├── index.tsx           # Setup torneo (selezione giocatori)
│   └── tournament.tsx      # Pagina torneo: tab Partite / Classifica / Giocatori
├── components/
│   ├── PlayersEditor.tsx   # Editor rosa (3-8 giocatori, validazione)
│   ├── ThemeToggle.tsx     # Toggle tema sistema/dark/light
│   └── ui/                 # Componenti shadcn
├── hooks/
│   ├── useTournament.ts    # Stato torneo + persistenza localStorage
│   └── useTheme.ts         # Tema con preferenza OS, hydration-safe
├── lib/
│   └── tournament.ts       # Domain: tipi, generateRounds, computeStandings
└── styles.css              # Tokens design system, neon arcade
```

---

## 🚀 Sviluppo locale

```bash
bun install
bun dev          # http://localhost:5173
bun run build    # build di produzione
bun run lint
bun run format
```

---

## 🎮 Come usare l'app

1. **Setup**: scegli 3–8 giocatori (puoi rinominarli, aggiungerli o rimuoverli). Vedi anteprima turni/partite.
2. **Avvia torneo** → vai alla pagina `/tournament`.
3. **Tab Partite**: inserisci i punteggi (0–11) per ogni match. Il vincitore (e la classifica) si aggiorna istantaneamente.
4. **Tab Classifica**: tabella compatta + griglia 2-colonne con card colorate per giocatore, barra win-rate, medaglia per la prima posizione.
5. **Tab Giocatori**: rinomina i partecipanti senza perdere i punteggi.
6. **Reset partite**: azzera score mantenendo la rosa.
7. **Chiudi torneo**: torna al setup (cancella lo stato salvato).

---

## 🎨 Sistema temi

Token `oklch` in `src/styles.css`. Stati gestiti:

- `system` (default): segue `prefers-color-scheme`.
- `dark`: dark arcade neon (default storico).
- `light`: light arcade — mantiene i colori vividi neon.

La preferenza è salvata in `localStorage` come `pp-theme`. Uno script blocking inline in `__root.tsx` previene il FOUC al primo paint.

---

## 📜 Documentazione aggiuntiva

- [`CHANGELOG.md`](./CHANGELOG.md) — storico delle modifiche.
- [`docs/architecture.md`](./docs/architecture.md) — panoramica tecnica (routing, stato, persistenza, temi).
- [`docs/tournament-logic.md`](./docs/tournament-logic.md) — algoritmo Berger e classifica.
- [`.lovable/plan.md`](./.lovable/plan.md) — piano di lavoro corrente.

---

## 📄 Licenza

Progetto privato generato con [Lovable](https://lovable.dev).
