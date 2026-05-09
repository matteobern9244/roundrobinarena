## Obiettivo

Rimuovere il pulsante ↺ "reset torneo" dall'header della schermata torneo (non rimescola, è fuorviante) e confermare che le funzionalità chiave dell'app siano integre.

## Cosa cambio

### 1) Rimozione pulsante ↺ nell'header del torneo
- File: `src/routes/tournament.tsx`
- Tolgo dal componente `Header` il bottone ↺ e la prop `onReset`.
- Tolgo da `TournamentPage` `resetMatches` e `handleReset` (non più usati).
- Lascio intatto il blocco "Zona Pericolo" nella tab Giocatori con il bottone **🗑 Nuovo Torneo**, che già cancella tutto e riporta al setup (dove un nuovo avvio fa un nuovo sorteggio casuale).
- Lascio comunque esportata `resetMatches` da `useTournament` (non costa nulla, può servire) — oppure la rimuovo se preferisci pulizia totale.

### 2) Verifica funzionalità (solo controllo, nessuna modifica se già ok)
- **Salvataggio punteggi**: `applyScoreUpdate` + `updateMatch` scrivono su `localStorage` (`pp-tournament-v1`) ad ogni cifra digitata. ID match stabili (alfabetici) → niente reset spurio.
- **Creazione casuale**: `startTournament` chiama `shufflePlayers` (Fisher-Yates) prima di `buildFreshMatches`. L'ordine mescolato viene persistito, quindi gli ID match restano stabili tra i render.
- **All vs All**: `generateRounds` usa l'algoritmo di Berger su lista mescolata → ogni giocatore incontra tutti gli altri esattamente una volta. Con N dispari uno riposa per turno (BYE).
- **Modifica rosa**:
  - Stessa lunghezza + soli rinomini → mantiene punteggi (`renamePlayers`).
  - Cambio rosa effettivo → conferma + nuovo sorteggio casuale (`replacePlayers`).
- **Persistenza tema** (`pp-theme`) e **offline PWA** restano come da fix precedenti.

## Risultato atteso
- Header torneo più pulito, senza pulsante che confondeva.
- Per ricominciare da capo si usa **Giocatori → Nuovo Torneo**, che porta al setup e al successivo sorteggio davvero casuale.
- Salvataggi e round-robin invariati e funzionanti.
