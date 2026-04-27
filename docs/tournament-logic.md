# Logica del torneo

Documenta le regole e gli algoritmi implementati in `src/lib/tournament.ts`.

## Costanti

| Costante | Valore | Significato |
|----------|--------|-------------|
| `WIN_SCORE` | `11` | Punteggio per vincere un match (set secco). |
| `MIN_PLAYERS` | `3` | Minimo giocatori per avviare un torneo. |
| `MAX_PLAYERS` | `8` | Massimo giocatori. |
| `STORAGE_KEY` | `"pp-tournament-v1"` | Chiave `localStorage`. |
| `PLAYER_COLORS` | 8 colori HEX | Assegnati per posizione nella rosa. |

> Nota: c'è una richiesta in sospeso di portare `MIN_PLAYERS` a 2 (vedi `CHANGELOG.md` sezione *Unreleased*). Finché non è applicata, il minimo resta 3.

## Generazione dei round (algoritmo di Berger)

`generateRounds(players: string[]): Round[]`

Implementa il classico round-robin di Berger:

1. Se il numero di giocatori è dispari, viene aggiunto uno slot fittizio `__BYE__`.
2. Si fissa il primo giocatore e si fanno ruotare gli altri di una posizione per turno.
3. Per ogni turno si accoppiano `slots[i]` con `slots[n-1-i]`.
4. Se uno dei due è il `BYE`, l'altro giocatore **riposa** quel turno (campo `resting` del round).

### Risultato

| Caso | Numero turni | Match per turno | Riposo |
|------|--------------|------------------|--------|
| N pari | `N - 1` | `N / 2` | nessuno |
| N dispari | `N` | `(N - 1) / 2` | un giocatore per turno |

Il **totale partite** è sempre `N · (N-1) / 2`.

### ID dei match

Per evitare che cambi l'ordine `p1 / p2` invalidando lo stato salvato, ogni ID è costruito con i nomi **ordinati alfabeticamente**:

```
r{round}-{nameA}__{nameB}    // nameA < nameB lessicograficamente
```

Questo permette di mantenere stabili gli ID anche dopo `rebuildLiveRounds`.

## Aggiornamento score

`applyScoreUpdate(match, "score1" | "score2", rawValue)`

- Pulisce l'input: solo cifre, max 2 caratteri.
- Rifiuta valori `< 0` o `> WIN_SCORE` (ritorna `null` → la UI ignora il tasto).
- Determina il vincitore:
  - `score1 === 11 && score2 < 11` → vince `p1`.
  - `score2 === 11 && score1 < 11` → vince `p2`.
  - Altrimenti `winner = null` (match non concluso).

Non sono ammessi ai punti pareggio o set lunghi: la regola è 11 secco.

## Classifica

`computeStandings(players, matches): Standing[]`

Aggrega solo i match con `winner !== null` e score numerici validi.

Per ogni giocatore calcola:

| Campo | Significato |
|-------|-------------|
| `wins` | partite vinte |
| `losses` | partite perse |
| `played` | totale partite giocate (con esito) |
| `pf` | **Punti Fatti** — somma dei punti segnati |
| `pa` | **Punti Subiti** — somma dei punti subiti |

### Ordinamento

1. Più vittorie.
2. A parità: maggiore differenza punti (`pf - pa`).
3. A ulteriore parità: più punti fatti.

## Validazione rosa

`validatePlayers(names)`:

- Almeno `MIN_PLAYERS`, al massimo `MAX_PLAYERS`.
- Nessun nome vuoto (dopo `trim`).
- Nessun duplicato (case-insensitive).

Ritorna `null` se valida, altrimenti il messaggio d'errore in italiano.

## Ricostruzione live dei round

`rebuildLiveRounds(players, matches)`:

Genera lo "scheletro" via `generateRounds(players)` e poi sovrascrive ogni match con la versione attuale (con score e winner) presa da una mappa `id → match`. Serve a presentare i match raggruppati per round nella UI senza dover persistere l'intera struttura `Round[]`.
