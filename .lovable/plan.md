# Piano: offline completo e affidabile per tutta l’app

## Obiettivo
Far funzionare davvero l’app senza rete, sia:
- aprendo la PWA già offline
- andando offline mentre l’app è aperta
- rientrando nelle schermate principali senza nuove richieste di rete

## Cosa cambierò

### 1) Rendere offline la shell dell’app in modo deterministico
- Sostituire il fallback HTML “opportunistico” del Service Worker con una shell offline esplicita e sempre disponibile.
- Cacheare in modo affidabile la pagina principale e i file essenziali per l’avvio dell’app, così l’app non dipende da una fetch runtime a `/` che può fallire o arrivare troppo tardi.
- Gestire correttamente le navigazioni in modalità standalone PWA e browser normale.

### 2) Garantire offline anche il routing interno
- Verificare e adattare la strategia di caching delle navigazioni TanStack Start, così la route `/tournament` continua a funzionare offline e non cade su schermo vuoto/nero.
- Evitare che la route attiva dipenda da HTML o chunk non ancora presenti in cache.
- Se necessario, aggiungere una strategia di preload/cache per i chunk critici delle route principali.

### 3) Far partire l’app offline anche dopo il primo avvio online
- Migliorare l’installazione/attivazione del Service Worker per pre-cache e warmup reali dei file indispensabili.
- Eliminare i casi in cui il Service Worker è installato ma la shell non è ancora pronta quando l’utente chiude o perde connessione.
- Verificare il flusso di update, così non resta una versione mezza cacheata.

### 4) Proteggere l’esperienza in assenza di rete
- Aggiungere un fallback UI chiaro quando il browser è offline ma manca ancora qualche risorsa locale, invece di finire in pagina nera.
- Mantenere i dati torneo e tema completamente locali come già previsto, senza introdurre backend.
- Controllare che non ci siano dipendenze residue dalla rete nelle schermate principali.

### 5) Validare i casi reali d’uso offline
Testerò i casi critici da coprire:
- primo avvio online, poi refresh offline
- apertura diretta della PWA offline
- uso dell’app aperta mentre si perde la connessione
- navigazione tra setup e torneo offline con dati già salvati

## Risultato atteso
Dopo la correzione, l’app dovrà aprirsi e restare utilizzabile offline in modo coerente, con classifica, partite, tema e stato torneo disponibili dal dispositivo anche senza connessione.

## Dettagli tecnici
- Revisione della config `vite-plugin-pwa` e del Service Worker custom.
- Possibile introduzione di una vera offline shell/fallback cacheata esplicitamente.
- Revisione del caching di HTML, asset hashati e chunk JS/CSS delle route principali.
- Verifica del bootstrap client e del flusso di registrazione/aggiornamento del SW per evitare cache parziali o shell mancante.