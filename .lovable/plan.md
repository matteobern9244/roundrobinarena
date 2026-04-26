## Obiettivo

Aggiungere un secondo tema **light arcade** all'app (senza toccare nulla del dark esistente), con:
- **Default = sistema operativo** (`prefers-color-scheme`)
- **Toggle manuale** che ha la precedenza e viene ricordato in `localStorage`
- Toggle visibile sia nell'**header del torneo** sia nella schermata di **setup iniziale**
- Estetica light che mantiene la **vibe arcade** (accenti neon vividi, glow attenuati ma presenti)
- **Zero regressioni** sul tema dark (è e resta il look principale)

---

## 1 · Token CSS — `src/styles.css`

### a) Aggiunta variabili light nel `:root`
Oggi `:root` contiene direttamente i valori dark. Lo riorganizzo così:
- `:root` → contiene **i token light** come default visivo *fallback*, MA anche `color-scheme: light dark` per dire al browser che supportiamo entrambi
- `.dark` → contiene **tutti i token dark** (come oggi, ma esplicitati)
- Questo permette a `dark`/`light` di essere indipendenti senza che il light "eredite" rimasugli del dark

In pratica: estraggo l'attuale blocco di valori da `:root` (riga 58-112) e lo duplico anche dentro `.dark` (oggi `.dark` ha solo metà dei token — manca `--surface-1/2/3`, `--neon-*`, `--gradient-*`, `--glow-*` che sono globali in `:root`). Risultato: i token "globali" (neon, gradienti, glow) restano in `:root` perché identici nei due temi, mentre i token *semantici* (background, foreground, card, surface, border, muted, ecc.) vengono duplicati con valori chiari sotto `.light` (o lasciati in `:root` come default light, e `.dark` li sovrascrive).

**Strategia scelta** (più sicura, niente regressioni):
- Tengo `.dark` come oggi → contiene esplicitamente tutto il dark
- Cambio `:root` in modo che ospiti i **token light** + tutti i token "neutri" (radius, neon, gradienti, glow, font)
- Aggiungo `color-scheme: light dark` su `:root` e lo specializzo (`light` / `dark`) nelle classi

### b) Palette light arcade
Valori light proposti (oklch, in linea col design system):
```
--background: oklch(0.985 0.005 250);   /* bianco caldo, niente puro #fff */
--foreground: oklch(0.18 0.02 270);     /* testo quasi-nero bluastro */
--surface-1: oklch(0.96 0.008 250);
--surface-2: oklch(0.93 0.01 250);
--surface-3: oklch(0.89 0.012 250);
--card: oklch(1 0 0);
--card-foreground: oklch(0.18 0.02 270);
--popover: oklch(1 0 0);
--popover-foreground: oklch(0.18 0.02 270);

/* Primary cyan ma scurito per contrasto su sfondo chiaro */
--primary: oklch(0.55 0.16 220);
--primary-foreground: oklch(0.98 0.005 250);

--secondary: oklch(0.93 0.01 250);
--secondary-foreground: oklch(0.18 0.02 270);
--muted: oklch(0.93 0.01 250);
--muted-foreground: oklch(0.45 0.02 260);
--accent: oklch(0.93 0.01 250);
--accent-foreground: oklch(0.18 0.02 270);
--destructive: oklch(0.55 0.22 25);
--destructive-foreground: oklch(0.98 0.005 250);
--border: oklch(0.85 0.012 250);
--input: oklch(0.85 0.012 250);
--ring: oklch(0.55 0.16 220);

/* Neon: stessi hue ma scuriti per restare vivi e leggibili su bianco */
--neon-cyan: oklch(0.62 0.18 220);
--neon-lime: oklch(0.68 0.22 130);
--neon-gold: oklch(0.72 0.17 90);
--neon-red: oklch(0.58 0.22 25);
--neon-magenta: oklch(0.55 0.25 350);

/* Header gradient adattato (chiaro→bianco) */
--gradient-header: linear-gradient(180deg, var(--surface-1), var(--background));
/* Glow ridotti ma visibili */
--glow-cyan: 0 0 16px color-mix(in oklab, var(--neon-cyan) 28%, transparent);
--glow-gold: 0 0 18px color-mix(in oklab, var(--neon-gold) 32%, transparent);
```

### c) Adattamenti minori per i componenti
Verifico che le classi `.neon-title`, `.neon-logo`, `.match-card.is-done`, `.standings-row.is-top`, `.champion-banner`, `.saved-toast` funzionino bene con i nuovi token. Sono già scritte con `var(--color-*)` e `color-mix`, quindi si adattano automaticamente. Eventuale fine-tuning solo su:
- `.neon-title` text-shadow → riduco intensità nel light (override scoped: `:root:not(.dark) .neon-title { text-shadow: 0 0 12px ... }`)
- `.match-card.is-done` background → oggi è `color-mix(neon-lime 4%, card)`, su bianco diventa quasi invisibile → porto al 10% nel light
- `.score-input` → su light il `surface-2` chiaro va già bene, già coperto dai token

### d) Meta `theme-color` dinamico
Tolgo da `__root.tsx` l'attuale meta `{ name: "theme-color", content: "#0a0a14" }` e lo gestisco runtime via JS sul componente `ThemeProvider` (vedi punto 3), aggiornando `<meta name="theme-color">` in base al tema attivo (chiaro → `#fafafa`, scuro → `#0a0a14`). Aggiungo anche le **media-queried** statiche come fallback SSR:
```html
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#fafafa">
<meta name="theme-color" media="(prefers-color-scheme: dark)"  content="#0a0a14">
```

---

## 2 · Shell HTML — `src/routes/__root.tsx`

- Rimuovo `className="dark"` hardcoded da `<html>` (riga 80) → diventa `<html lang="it" suppressHydrationWarning>` 
- Aggiungo uno script *blocking inline* nell'`<head>` (via `head.scripts` di TanStack) che, **prima** della prima paint, legge `localStorage["pp-theme"]` (`"light" | "dark" | null`) e applica la classe corretta a `document.documentElement`. Se non c'è scelta utente, usa `matchMedia("(prefers-color-scheme: dark)")`. Questo evita il **FOUC** (flash bianco/scuro) all'avvio e funziona sia in dev che in standalone PWA.
- Aggiorno `color-scheme` meta a `"light dark"` invece di `"dark"`.
- Aggiorno i 2 meta `theme-color` con media query (vedi punto 1d).

---

## 3 · Hook tema — nuovo file `src/hooks/useTheme.ts`

Hook minimale, no librerie esterne:
```ts
type Theme = "light" | "dark";
type ThemeMode = Theme | "system"; // scelta utente
useTheme() → { theme: Theme, mode: ThemeMode, setMode: (m) => void, toggle: () => void }
```
- Legge/scrive `localStorage["pp-theme"]` (valori: `"light"`, `"dark"`, o assente = system)
- Applica/rimuove classe `dark` su `document.documentElement`
- Sottoscrive `matchMedia("(prefers-color-scheme: dark)")` quando mode = `"system"` (così se l'utente cambia tema OS mentre l'app è aperta, si aggiorna live)
- Sincronizza `<meta name="theme-color">` runtime
- SSR-safe: durante SSR ritorna `theme: "dark"` (default arcade) e si aggiorna lato client al mount; lo script inline del punto 2 evita il flash visivo.

---

## 4 · Componente toggle — nuovo file `src/components/ThemeToggle.tsx`

Bottone unico icona (Sun ↔ Moon da `lucide-react` — già installato come dipendenza shadcn) con:
- `aria-label="Cambia tema"` + `aria-pressed`
- Stesso stile compatto del pulsante reset esistente nell'header (`h-10 w-10` o `h-9 w-9`, border, rounded-md, hover neon-cyan)
- Click → `toggle()` (light↔dark esplicito, ignorando `system` se l'utente clicca volontariamente)
- Animazione sottile (rotate-90 + fade) sull'icona al cambio

---

## 5 · Inserimento toggle nelle pagine

### a) `src/routes/tournament.tsx` — header
Nella riga 1 dell'header (logo + titolo + reset, righe ~152-172) inserisco `<ThemeToggle />` **prima** del pulsante reset, così sull'header sticky compare: `🏓 PING PONG ........ [☀/🌙] [↺]`. Touch target 40×40, già conforme alle linee guida mobile.

### b) `src/routes/index.tsx` — setup iniziale
Aggiungo un piccolo selettore **in alto a destra**, fluttuante rispetto all'header centrato:
```tsx
<div className="absolute right-3 top-3 safe-top"><ThemeToggle /></div>
```
Sulla `<main>` aggiungo `relative`. Nessun impatto sul layout centrato esistente.

---

## 6 · Verifiche per "no regressioni" (checklist QA)

Dopo le modifiche eseguo questa verifica visiva mentale + (se il preview è disponibile) console:

**Dark mode (default)**
- [ ] Logo, titolo neon, header gradient, progress bar identici a prima (stessi token)
- [ ] Match card hover/done invariati
- [ ] Score input vincente con border colorato del giocatore: invariato
- [ ] Toast "salvato" lime invariato
- [ ] Champion banner gold pulsante invariato
- [ ] Tab attivo cyan glow invariato
- [ ] Setup page e PlayersEditor invariati

**Light mode (nuovo)**
- [ ] Sfondo chiaro caldo, testo quasi-nero
- [ ] Accenti cyan/lime/gold ancora vividi e leggibili (contrast ratio ≥ 4.5:1 su testi)
- [ ] Glow ridotti ma percepibili (vibe arcade preservata)
- [ ] Score input visibili anche in stato `is-loser` (non spariscono su sfondo chiaro)
- [ ] Match card "is-done" distinguibile (lime al 10%)
- [ ] Champion banner pulsa ancora
- [ ] Toast "salvato" leggibile
- [ ] Pulsante "Inizia Torneo" disabilitato non sparisce

**Comportamento toggle**
- [ ] Primo accesso senza preferenza → segue OS
- [ ] Click toggle → cambia istantaneamente, persiste al refresh
- [ ] Cambio tema OS in tempo reale → app si adatta (solo se utente non ha mai cliccato il toggle)
- [ ] Niente FOUC al refresh in dark, niente FOUC in light
- [ ] PWA installata: theme-color della status bar iOS/Android coerente col tema

---

## 7 · File toccati / creati

**Modificati**
- `src/styles.css` — riorganizzazione `:root` + `.dark`, palette light arcade, override scoped per `.neon-title` light, fix `.match-card.is-done` light
- `src/routes/__root.tsx` — rimozione `className="dark"` hardcoded, aggiunta script anti-FOUC inline, meta `theme-color` con media query, `color-scheme: light dark`
- `src/routes/tournament.tsx` — `<ThemeToggle />` nell'header (1 riga)
- `src/routes/index.tsx` — `<ThemeToggle />` posizionato assoluto top-right (3 righe)

**Creati**
- `src/hooks/useTheme.ts` — hook tema con system + persistenza + sync meta
- `src/components/ThemeToggle.tsx` — bottone icona Sun/Moon

**Memoria progetto** (a fine implementazione)
- Salverò in `mem://design/theme-system` la scelta dual-theme + default system + toggle in 2 punti, così rimane traccia per future modifiche.

---

## 8 · Cosa NON faccio (per evitare scope creep / regressioni)

- ❌ Niente libreria `next-themes` o simili — overkill, gestiamo a mano
- ❌ Nessuna modifica ai componenti shadcn (`ui/*`) — già usano i token semantici
- ❌ Nessun cambio alla logica torneo, persistenza match, generatore Berger, PWA manifest, icone
- ❌ Nessun "tema sistema" come terza opzione esposta in UI — il toggle è binario light/dark, ma il *default iniziale* segue il sistema (UX pulita, no menu a tendina)

Pronto a implementare appena dai l'ok.