# 🏓 Torneo Ping Pong — All vs All configurabile

App per gestire un torneo round-robin di ping pong con **3-8 giocatori configurabili**, gestione automatica del numero **dispari** (un giocatore riposa a turno), classifica live e salvataggio automatico. Estetica dark/neon coerente con il riferimento, ma rifinita usando il design system del progetto.

## Schermate

### 1. Setup iniziale (route `/`)
Mostrata quando non c'è ancora un torneo salvato.
- Titolo "PING PONG · NUOVO TORNEO" con stesso look neon (logo 🏓, glow ciano).
- Lista editabile di giocatori (default 6 nomi: Fabio, Matteo, Christian, Cristina, Daniele, Adriano — come nel codice di riferimento).
- Per ogni riga: input nome + pulsante rimuovi (disattivato se si scende sotto 3).
- Pulsante "+ Aggiungi giocatore" (disattivato a 8).
- Validazioni: nomi non vuoti, niente duplicati, min 3 / max 8.
- Anteprima sotto il form: "X giocatori · Y turni · Z partite totali" calcolato in tempo reale (con avviso se dispari: "Un giocatore riposerà a ogni turno").
- Pulsante grande "⚡ INIZIA TORNEO".

### 2. Torneo (route `/tournament`)
Stessa identica struttura del codice di riferimento, con tre tab invece di due:

**Header sticky** — logo, titolo, sottotitolo dinamico ("N GIOCATORI · ALL VS ALL · PARTITA SINGOLA A 11"), barra di progresso "X/Y partite · Z%", indicatore "✓ Salvato" temporaneo.

**Tab ⚡ PARTITE**
- Lista turni, ognuno è un blocco con header "TURNO N", contatore "x/y completate", badge "✓ COMPLETATO" quando finito.
- Card partita: giocatore 1 (pallino colorato + nome) · input punteggio · `:` · input punteggio · giocatore 2 + 🏆 sul vincitore.
- Se il turno ha un giocatore in pausa (numero dispari): riga aggiuntiva "🛋️ Riposa: <nome>" con pallino del colore del giocatore.
- Logica vincitore: chi arriva a 11 con avversario < 11 (invariata).

**Tab 🏆 CLASSIFICA**
- Banner "🎉 CAMPIONE: <nome>" quando tutte le partite sono giocate.
- Tabella: #, Giocatore, G, V, P, PF, PS, +/− (medaglie 🥇🥈🥉 per i primi tre, riga top evidenziata in oro).
- Sotto, card per giocatore con winrate e barra di progresso.
- Ordinamento: vittorie → differenza punti → punti fatti (invariato).

**Tab 👥 GIOCATORI** (nuovo)
- Stessa UI del setup iniziale per modificare la rosa.
- Aggiunte/rimozioni → conferma "Cambiare la rosa azzererà il torneo. Continuare?" → reset completo con i nuovi nomi.
- Rinomina pura (nessun cambio di numero/ordine, solo testo) → nessun reset, mantiene punteggi e aggiorna i nomi.

**Pulsante ↺ RESET** in alto: azzera tutte le partite mantenendo la rosa.

## Generazione round-robin

Algoritmo Berger esteso al caso dispari:
- Se N è dispari, aggiungo uno slot fittizio "BYE". Risultano N turni invece di N−1.
- A ogni turno, il giocatore accoppiato con BYE è quello che "riposa".
- Numero partite totali = N × (N−1) / 2 (ogni coppia gioca una volta).

## Persistenza

Salvataggio automatico in `localStorage` (chiave `pp-tournament-v1`) di:
- Lista giocatori configurata
- Stato di tutte le partite (punteggi + vincitore)

Al primo avvio: niente salvataggio → schermata Setup. Con dati salvati → vai direttamente al Torneo. Reset rosa o reset torneo aggiornano lo storage.

## Design

- Palette dark/neon: sfondo `#09090f`, accenti ciano `#00d9ff`, verde `#7fff00`, oro `#ffd700`, rosso `#ff4d4d`.
- Font monospace (Courier New / JetBrains Mono) per dare il feel arcade.
- 8 colori giocatore predefiniti (i 6 attuali + 2 extra): arancio, ciano, verde lime, magenta, oro, viola, rosa pesca, azzurro ghiaccio. Assegnati in ordine alla rosa.
- Animazioni: pulse sul banner campione, glow sui punteggi vincenti, transizioni fluide sui tab.
- Layout responsivo: ottimizzato per mobile (viewport ~440px) — card partita che resta leggibile, tabella classifica scrollabile orizzontalmente se serve.

## Routing

- `/` — Setup (redirect a `/tournament` se esiste uno stato salvato)
- `/tournament` — Torneo con i tre tab interni gestiti via state (non sub-routes, per mantenere lo state condiviso senza overhead)

## Fuori scope

- Multi-torneo / cronologia tornei passati
- Autenticazione, sync cloud (solo localStorage)
- Match al meglio di N (resta partita singola a 11)
- Statistiche avanzate (head-to-head, streak, grafici temporali)