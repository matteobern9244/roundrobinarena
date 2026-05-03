## Cosa cambia

Ogni volta che si clicca "Inizia Torneo", l'ordine dei giocatori viene mescolato casualmente (shuffle) prima di passarli all'algoritmo di Berger. Questo produce accoppiamenti e ordine dei turni diversi ad ogni avvio, pur garantendo che ogni giocatore affronti tutti gli altri esattamente una volta (nessun match duplicato).

## Dettaglio tecnico

### `src/lib/tournament.ts` — aggiungere shuffle

Aggiungere una funzione Fisher-Yates shuffle. Modificare `generateRounds` per mescolare la lista dei giocatori all'inizio, prima di applicare l'algoritmo di Berger.

```ts
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateRounds(players: string[]): Round[] {
  const list = shuffle(players);  // <-- unica modifica qui
  // ... resto invariato
}
```

L'algoritmo di Berger continua a garantire tutti-contro-tutti e zero duplicati; cambia solo l'ordine in cui i match vengono generati.

Nessun altro file da modificare: `buildFreshMatches`, `rebuildLiveRounds` e la UI usano già `generateRounds` come unica fonte.
