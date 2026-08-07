# Obiettivo

L'app deve funzionare offline in modo affidabile: apertura da icona senza rete, refresh offline, navigazione tra setup e torneo, inserimento punteggi. Zero regressioni su logiche esistenti (round-robin, punteggi, classifica, tema, palla del servizio).

## Cosa ho verificato adesso

- L'app non fa **nessuna** chiamata di rete a runtime: gli unici `fetch` del progetto sono dentro `src/sw.ts`. Tutti i dati stanno in `localStorage` (`pp-tournament-v1`, `pp-theme`). Quindi il problema offline non è nei dati, è solo nel **bootstrap dell'app** (HTML + chunk JS/CSS).
- L'app è SSR su Cloudflare Workers (`wrangler.jsonc` → `@tanstack/react-start/server-entry`): non esiste un `index.html` statico. Ogni navigazione a freddo richiede una risposta HTML dal Worker → offline serve una HTML in cache.
- Esiste già un Service Worker custom (`src/sw.ts`, strategia `injectManifest`) che al momento dell'install prova a pre-scaricare `/` e `/tournament` con gli asset referenziati, più registrazione manuale in `src/pwa-register.ts`.
- Non c'è nessuna build presente nel workspace, quindi **non ho potuto verificare** se `sw.js` viene realmente emesso e servito come asset statico dal deploy Cloudflare. Questa è la causa candidata numero uno del fallimento (registrazione che va in `catch` silenzioso e nessun SW attivo), ma è **non confermata**: verificarla è il primo passo del piano, non un'assunzione.

## Diagnosi non confermata (da verificare per prima cosa)

Ipotesi in ordine di probabilità:

1. `sw.js` non finisce tra gli asset client serviti dal Worker → `/sw.js` risponde HTML/404 → `registerSW` fallisce e `src/pwa-register.ts` inghiotte l'errore in un `catch {}` vuoto.
2. Il SW si registra ma il pre-fetch della shell all'install fallisce parzialmente (asset hashati mancanti) → HTML in cache senza i suoi chunk → schermo nero.
3. La guardia host in `pwa-register.ts` controlla `id-preview--` e `lovableproject.com` ma non `.lovable.app`: sul published funziona, ma i test fatti dentro l'editor non registrano nulla — possibile falso negativo nei test precedenti.

## Passo 1 — Verifica (nessuna modifica di codice)

- Eseguire una build di produzione e ispezionare gli asset client: `sw.js` presente? contiene il manifest di precache? quali file sono elencati?
- Verificare il routing degli asset statici del Worker per `/sw.js` e `/manifest.webmanifest` (content-type e status corretti).
- Servire la build in locale e testare con Playwright: registrazione SW, contenuto delle Cache Storage, poi `context.set_offline(True)` + reload su `/` e su `/tournament`.

Solo dopo questa verifica si applica il fix corrispondente. Se la causa risulta diversa dalle tre ipotesi, si aggiorna il piano.

## Passo 2 — Fix del bootstrap offline

Interventi previsti, tutti confinati a `src/sw.ts`, `src/pwa-register.ts`, `vite.config.ts`:

- **Emissione garantita**: assicurare che `sw.js` sia emesso nella root degli asset client e servito con `Content-Type: application/javascript` e scope `/`. Se l'output PWA non finisce dove il Worker serve gli statici, correggere la configurazione `VitePWA` (cartella di output) invece di aggirare il problema.
- **Precache atomico e affidabile**: invece del parsing HTML best-effort attuale, usare il manifest generato dalla build (`self.__WB_MANIFEST`) come fonte di verità per JS/CSS/font/icone, e mantenere il fetch attivo della **shell HTML** di `/` e `/tournament` come unica parte non coperta dal manifest. Se il precache degli asset fallisce, il SW non deve considerarsi installato con successo per la parte shell.
- **Navigazioni**: `NetworkFirst` con timeout breve e fallback su qualunque HTML in cache (già presente, da mantenere), con esclusione di `/api/` e `/~oauth`.
- **Errori visibili**: sostituire i `catch {}` silenziosi in `pwa-register.ts` con log espliciti in console, così un fallimento futuro è diagnosticabile invece di invisibile.
- **Guardie preview**: estendere il blocco alla famiglia `lovable.app`/`lovableproject-dev.com`/`beta.lovable.dev` e al kill switch `?sw=off`, con unregister dei SW residui nei contesti bloccati. Il SW resta attivo solo sul published.

## Passo 3 — Verifica anti-regressione

- Online: setup rosa 2–12 giocatori, avvio torneo, inserimento punteggi, classifica live, assegnazione palla 🏓, toggle tema, "Nuovo Torneo".
- Offline (Playwright su build di produzione locale): reload a freddo su `/` e su `/tournament`, navigazione tra le due, inserimento punteggio e persistenza dopo reload offline.
- Secondo carico offline dopo un aggiornamento di versione (verifica che la cache vecchia non serva chunk inesistenti).
- Confronto visivo dark e light per escludere regressioni di stile.

## Cosa NON cambia

- Nessuna modifica a `src/lib/tournament.ts`, `src/hooks/useTournament.ts`, `src/routes/index.tsx`, `src/routes/tournament.tsx`, componenti UI, stili, chiavi `localStorage`.
- Nessun cambio di framework o router, nessuna conversione a SPA statica.
- `public/manifest.webmanifest` invariato (`start_url`/`scope`/`display` restano identici: cambiarli richiederebbe la reinstallazione della PWA agli utenti già installati).

## Nota pratica

Offline non è testabile dentro l'editor Lovable (il SW è volutamente disattivato in iframe/preview per non servire cache stantia). La verifica finale va fatta sulla build di produzione locale e poi sul published URL.
