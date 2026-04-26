## Obiettivo

Rifare la **pagina Classifica** del torneo identica ai due screenshot allegati:
1. **Tabella compatta** sempre visibile (anche mobile), con colonne `#`, Giocatore, G, V, P, PF, PS, +/−.
2. **Sotto la tabella**, **griglia 2×N di card** giocatore con medaglia/numero, stats (Vinte/Perse/PF), barra e % win rate.

La logica è già tutta real-time (`computeStandings` viene ricalcolata ad ogni `updateMatch` via `useTournament` → setState → re-render), quindi **non tocco la logica**, solo il layout di `StandingsView` in `src/routes/tournament.tsx` + qualche regola CSS.

---

## Cosa cambia

### 1. `src/routes/tournament.tsx` — `StandingsView`

**Prima** (attuale): la tabella ha `hidden ... sm:block` → su mobile spariva e restavano solo le card. Le card erano in griglia `grid-cols-1 sm:grid-cols-2`.

**Dopo** (target screenshot):
- **Sezione tabella**: visibile sempre, anche su mobile.
  - Padding orizzontali ridotti (`px-2 py-2.5`) per stare in 360–390px.
  - Font `text-xs` su mobile, `text-sm` da `sm:`.
  - Colonna `Giocatore` allineata a sinistra con dot colorato + nome.
  - Colonne numeriche centrate con `tabular-nums`.
  - Colore semantico mantenuto: `V` → lime, `P` → muted, `+/−` → lime se ≥0 / red se <0.
  - Riga top: gradiente oro (già implementato in `.standings-row.is-top`).
  - Container con `overflow-x-auto` come safety net per nomi lunghi.

- **Sezione card sotto**: `grid-cols-2` **sempre** (non più `grid-cols-1 sm:grid-cols-2`), come nello screenshot 2.
  - Card più compatte con padding ridotto su mobile (`p-3 sm:p-4`).
  - Numero/medaglia centrato in alto.
  - Nome giocatore centrato, font-black, colore del player.
  - 3 mini-stat in fila (Vinte/Perse/PF).
  - Barra win-rate + label `0% win rate` centrata in basso.
  - Bordo del colore del giocatore per richiamare il wireframe (top → oro, altri → colore player con opacità ridotta).

- **Champion banner**: invariato, resta in cima quando il torneo è completo.

### 2. `src/styles.css` — micro-ritocchi

- Verificare che `.standings-row.is-top` funzioni anche con la tabella compatta mobile (già OK, ma uno sguardo al mix-color su light theme).
- Aggiungere un'utility o classe `standings-table` con padding ridotti su mobile per evitare di spammare classi Tailwind condizionali nel JSX.
- Eventualmente ridurre il `gap` tra sezione tabella e griglia card da `gap-6` a `gap-4` per restare dentro lo screen mobile.

### 3. Real-time — nessun lavoro necessario

Verifica veloce: la pagina già reagisce in real-time perché:
- `MatchRow` chiama `onScoreChange` → `updateMatch` (in `useTournament`) → `setState` → ricalcolo di `standings = computeStandings(players, matches)` ad ogni render → propagato a `StandingsView`.
- Cambiando tab e tornando su Classifica, i dati sono freschi.
- Modificando uno score mentre si è già nel tab Classifica (caso raro, ma supportato): nessun caching, sempre derivato.

Quindi: **nessuna modifica a hook o a `tournament.ts`**.

---

## Cosa NON cambia

- Logica round-robin / standings / persistenza localStorage.
- Tab "Partite" e "Giocatori".
- Header sticky e progress bar.
- Sistema temi light/dark — la nuova tabella userà gli stessi token semantici (`text-muted-foreground`, `border-border`, `bg-card`, neon tokens) per restare coerente in entrambi i temi.

---

## File toccati

- `src/routes/tournament.tsx` (riscrittura di `StandingsView` + `MiniStat`)
- `src/styles.css` (ritocchi minori, opzionali)

## QA mentale post-implementazione

- iPhone SE (375px): tabella sta dentro senza scroll orizzontale per nomi ≤10 caratteri; oltre, scroll orizzontale solo sulla tabella.
- iPhone 14 Pro Max (430px): layout identico agli screenshot.
- Desktop: stessa identica griglia, ma con più respiro grazie ai breakpoint `sm:`.
- Light + Dark: tutti i colori passano dai token, niente regressioni.
- Real-time: aprire Classifica, in un'altra tab inserire uno score → tornare → numeri aggiornati. Oppure inserire score con la pagina Classifica già attiva (improbabile ma supportato).
