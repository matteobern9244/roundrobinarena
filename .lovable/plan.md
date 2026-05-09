## Obiettivo

Mostrare in tempo reale una pallina 🏓 accanto al giocatore al servizio. La regola corretta è:

1. **A inizio match** (0–0) nessuno ha ancora la palla. Si gioca un punto "fittizio" **non conteggiato**: vince chi prende la palla.
2. **Sono io (utente) ad assegnare manualmente la palla** al giocatore vincitore di quel punto fittizio, toccando un segnalino 🏓 nel suo lato.
3. **Da quel momento** il punteggio resta 0–0 e si comincia a contare. Ogni **5 punti totali** la palla cambia mano in automatico.
4. Posso cambiare idea finché il punteggio è 0–0 (ad es. tap sull'altro lato sposta la palla). Una volta che parte il punteggio reale, l'assegnazione è "congelata" e da lì regola dei 5 punti.
5. Quando il match finisce (`winner`), la pallina sparisce e resta solo il 🏆.

## Modello dati

Aggiungo a `Match` un campo opzionale:

```ts
firstServer: "p1" | "p2" | null;  // chi ha vinto il punto fittizio iniziale
```

Persistito in `localStorage` come tutto il resto (`pp-tournament-v1`). Retro-compatibile: i match esistenti partono con `firstServer: null`.

## Logica del segnalino

Helper puro in `src/lib/tournament.ts`:

```ts
export const SERVE_SWITCH_EVERY = 5;

export function currentServer(match: Match): "p1" | "p2" | null {
  if (match.winner) return null;
  if (!match.firstServer) return null;
  const s1 = parseInt(match.score1, 10);
  const s2 = parseInt(match.score2, 10);
  const total = (Number.isNaN(s1) ? 0 : s1) + (Number.isNaN(s2) ? 0 : s2);
  const switches = Math.floor(total / SERVE_SWITCH_EVERY);
  return switches % 2 === 0
    ? match.firstServer
    : match.firstServer === "p1" ? "p2" : "p1";
}
```

Funzione di assegnazione/cambio (chiamata solo a 0–0):

```ts
export function setFirstServer(match: Match, server: "p1" | "p2" | null): Match {
  return { ...match, firstServer: server };
}
```

## UI: `MatchRow` in `src/routes/tournament.tsx`

- Calcolo `total = score1 + score2` (numerici).
- Calcolo `server = currentServer(match)`.
- **Stato A — match non iniziato** (`!winner && total === 0`):
  - Su entrambi i lati mostro un piccolo bottone 🏓 (touch ≥40×40):
    - Lato del `firstServer` corrente → pieno/illuminato (`neon-cyan` glow).
    - Lato opposto → outline tenue, "tap to assign".
  - Tap su un lato: chiama `onAssignServer(match, "p1" | "p2")` → aggiorna lo state via nuova azione hook (vedi sotto). Tap di nuovo sullo stesso lato: nessun cambio (idempotente). Per "togliere" non serve flusso esplicito (basta non assegnare).
  - Hint testuale piccolo sotto il match: "Assegna la palla al vincitore del primo scambio" (solo finché `firstServer === null`).
- **Stato B — match in corso** (`total > 0 && !winner`):
  - Mostro la 🏓 fissa accanto al nome del `server` (lato sinistro o destro a seconda).
  - I bottoni di assegnazione spariscono: la palla ora segue la regola dei 5 punti.
- **Stato C — match finito**: nessuna pallina, solo 🏆 sul vincitore.

Posizionamento icona: dentro `.player-side`, tra dot e nome (sx) o tra nome e dot (dx). `aria-label="Al servizio"` o `"Assegna la palla a {nome}"`.

## Hook `useTournament`

Aggiungo un'azione:

```ts
assignServer: (matchId: string, server: "p1" | "p2") => void;
```

Implementazione: aggiorna il match nel state solo se `score1`/`score2` sono entrambi vuoti/0 e non c'è winner (guardia di sicurezza), poi `persist`. In questo modo non si può "barare" cambiando il server a metà match.

## Stile (`src/styles.css`)

Aggiungo classi minimali:
- `.serve-ball` → emoji un po' più grande, `drop-shadow` con `--neon-cyan`, `transition` su transform/opacity.
- `.serve-assign-btn` → bottone tondo 40×40, bordo `border-border`, hover `bg-accent`, stato attivo con glow `--neon-cyan`. Solo token semantici, niente colori hardcoded.
- Animazione di apparizione: `animate-fade-in` esistente.

## Cosa NON cambia

- Punteggi, vincitore, classifica, round-robin, shuffle, validazioni, persistenza generale.
- Nessuna nuova chiave `localStorage`: il `firstServer` viaggia dentro `Match`.
- Nessun impatto su match già esistenti: partono semplicemente senza segnalino e l'utente lo assegna come per i nuovi.

## Risultato atteso

- Match nuovo: a 0–0 vedo due segnalini 🏓 (uno per lato), tappabili. Tap → quel giocatore "ha la palla". Posso cambiare idea finché siamo a 0–0.
- Appena il punteggio diventa diverso da 0–0, i bottoni spariscono e la 🏓 segue la regola: cambia lato ogni 5 punti totali.
- Match finito: pallina via, 🏆 sul vincitore.
