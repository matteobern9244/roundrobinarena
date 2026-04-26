# 📱 Mobile-first + PWA installabile

Obiettivo: l'app deve essere perfetta su mobile (uso primario al 99%), restare leggibile/usabile anche su desktop, ed essere **installabile come PWA** con icone, splash e display standalone — esperienza identica al sito.

Tieni presente che la piattaforma usa un'iframe di preview che non è compatibile con i service worker (cache stantia, navigazione interrotta). Per questo motivo NON useremo `vite-plugin-pwa` né service worker. Per essere "installabile" e indistinguibile dall'app web basta un **manifest.json** ben fatto + meta tag iOS — questa è esattamente la raccomandazione ufficiale quando non serve l'offline. L'esperienza standalone (no barra browser, icona in home, splash) sarà identica al 100% all'app aperta nel browser.

> Se in futuro vorrai anche **funzionamento offline** (service worker + cache), sarà un secondo step opzionale, da abilitare solo dopo il deploy perché in editor preview rompe il refresh live.

---

## 1. Responsive mobile-first — refactor mirato

Ho controllato `tournament.tsx` e `index.tsx`: il grosso è già responsive, ma ci sono punti da rifinire per evitare overflow orizzontale su viewport stretti (≤375px) e migliorare l'ergonomia touch.

### Header torneo (`Header` in `src/routes/tournament.tsx`)
- Riorganizzazione in 2 righe su mobile: riga 1 = logo + titolo + barra progresso compatta sotto al titolo; riga 2 = tab scorrevoli orizzontalmente + reset.
- Tab bar: aggiungere `overflow-x-auto` con `scrollbar-hidden`, gap ridotto, snap orizzontale, tab più tappabili (min height 44px per accessibilità touch iOS).
- Spostare il pulsante **↺ Reset** in un menu/icona compatta (oggi su 360px va in seconda riga e taglia il layout).
- Indicatore "✓ Salvato" assoluto/toast in basso invece che inline (su mobile si sovrappone).

### Tab Partite (`MatchesView` / `MatchRow`)
- La grid `1fr auto 1fr` su 360px stringe i nomi. Migliorare: nomi giocatori che vanno a capo o si troncano gradevolmente; assicurare che la zona score (input+`:`+input) non si comprima mai (`flex-shrink-0`).
- Input punteggio: ingrandirli leggermente (48×48 su mobile) e impostare `inputMode="numeric"` + `pattern="[0-9]*"` per tastierino numerico iOS (verificare che ci sia già).
- Padding card ridotto su mobile (12px laterali invece di 14px) per recuperare spazio.

### Tab Classifica (`StandingsView`)
- Tabella oggi ha `overflow-x-auto`, OK ma su mobile l'orizzontalmente scrollabile non è ottimale. Soluzione: **due viste**:
  - Mobile (<640px): solo le card-giocatore (già presenti), senza tabella → meno scroll.
  - Desktop (≥640px): tabella completa + opzionalmente le card.
- Banner "Campione": ridurre tracking e font-size su mobile per non andare a capo male.

### Tab Giocatori (`PlayersTab`) e Setup (`index.tsx`)
- Già ben fatti. Verificare che gli input occupino tutta la larghezza e che il tasto rimuovi sia abbastanza grande (almeno 36×36px).
- Setup: il blocco anteprima 3 colonne va bene su mobile, ma valutare se spostare il pulsante "Inizia Torneo" sticky in basso per essere sempre raggiungibile col pollice.

### Safe areas iOS (notch / dynamic island)
- Aggiungere padding `env(safe-area-inset-*)` su header sticky e su eventuali bottoni sticky per non finire sotto il notch o sotto la home indicator quando installata in standalone.
- Aggiungere `viewport-fit=cover` al meta viewport in `__root.tsx`.

### Desktop
- Aggiungere `max-w-3xl mx-auto` (già c'è) e centrare meglio header/footer.
- Su schermi ≥1024px mostrare tabella classifica e card affiancate (grid 2 colonne) invece che una sotto l'altra.
- Hover states: già presenti, mantenere.

---

## 2. PWA installabile — manifest + icone + meta

### File da creare in `public/`
- `public/manifest.webmanifest` — definisce nome, colori, icone, `display: "standalone"`, `start_url: "/"`, orientamento `portrait`, lingua `it`, theme color coerente col background dark dell'app.
- `public/icon-192.png` — icona 192×192, sfondo dark con il 🏓 in stile neon ciano (generata in build come PNG da uno script Node, oppure con un SVG inline convertito). Userò un'icona programmatica generata via script Node usando `sharp` non disponibile su Worker → genero invece in fase di scrittura file statici, una volta sola.
- `public/icon-512.png` — 512×512 (per splash Android e store).
- `public/icon-512-maskable.png` — 512×512 con safe area al 80% (per icone adattive Android).
- `public/apple-touch-icon.png` — 180×180 (richiesto da iOS, non legge il manifest per l'icona home).
- `public/favicon.ico` (opzionale, già implicito).

> Le icone le genero con uno script una tantum durante l'implementazione, scegliendo lo sfondo `#0a0a14` e l'emoji 🏓 centrato con glow ciano, così sono perfettamente coerenti con l'estetica.

### Modifiche a `src/routes/__root.tsx` (head)
Aggiungere nella `head()`:
- `<link rel="manifest" href="/manifest.webmanifest">`
- `<meta name="theme-color" content="#0a0a14">`
- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">` (sostituisce quello attuale)
- `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`
- `<meta name="apple-mobile-web-app-capable" content="yes">` + `<meta name="mobile-web-app-capable" content="yes">`
- `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`
- `<meta name="apple-mobile-web-app-title" content="Ping Pong">`
- `<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">`

### Comportamento "installabile"
Con questo setup:
- **Chrome/Edge Android**: appare automaticamente il prompt "Aggiungi a schermata Home" → si installa e si apre standalone (no barra URL), splash screen generato dall'icona 512.
- **Safari iOS**: l'utente fa Condividi → "Aggiungi alla schermata Home" → si apre standalone, status bar trasparente, icona pulita.
- **Desktop Chrome/Edge**: appare l'icona "Installa" nella barra degli indirizzi → installata come app finestrata.

### Cosa non includeremo (e perché)
- **Service worker**: causerebbe contenuto stantio nell'editor preview di Lovable. L'app funzionerà solo con connessione (è comunque un'app locale che salva in localStorage, quindi una volta caricata anche su rete debole resta usabile durante la sessione).
- **Funzionamento offline completo**: opzionale come step 2, da fare solo dopo il deploy.

---

## 3. File toccati / creati

**Modificati**
- `src/routes/__root.tsx` — meta PWA, viewport con safe-area, link manifest e icone
- `src/routes/tournament.tsx` — Header responsive, tab scrollabili, vista classifica mobile/desktop, padding rifiniti
- `src/routes/index.tsx` — pulsante CTA leggermente più ergonomico su mobile
- `src/components/PlayersEditor.tsx` — touch target più grandi
- `src/styles.css` — aggiunte: `safe-area` utilities, `scrollbar-hidden`, breakpoint sm per `match-card` e `score-input`, regole `@media (display-mode: standalone)` per piccolo polish (es. nascondere eventuali elementi non utili in modalità app)

**Creati**
- `public/manifest.webmanifest`
- `public/icon-192.png`, `public/icon-512.png`, `public/icon-512-maskable.png`, `public/apple-touch-icon.png`

---

## 4. Verifica finale
- Test responsive a 320, 360, 390, 768, 1280px (browser tools).
- Lighthouse PWA: dovrebbe passare le voci "installable" (manifest + icone + display standalone). Le voci legate a service worker resteranno N/A — è atteso.
- Verifica console: nessun warning su manifest.

---

Confermi che procediamo così? (Se vuoi anche il **service worker per offline** dimmelo: lo faccio in una task separata, da attivare solo dopo deploy, con guard contro l'iframe di preview.)
