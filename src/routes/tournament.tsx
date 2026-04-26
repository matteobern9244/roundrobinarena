import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { PlayersEditor } from "@/components/PlayersEditor";
import { useTournament } from "@/hooks/useTournament";
import {
  applyScoreUpdate,
  colorFor,
  computeStandings,
  MEDALS,
  rebuildLiveRounds,
  validatePlayers,
  WIN_SCORE,
  type Match,
} from "@/lib/tournament";

export const Route = createFileRoute("/tournament")({
  component: TournamentPage,
});

type Tab = "matches" | "standings" | "players";

function TournamentPage() {
  const navigate = useNavigate();
  const {
    loaded,
    state,
    savedFlash,
    resetMatches,
    updateMatch,
    replacePlayers,
    renamePlayers,
    clearTournament,
  } = useTournament();
  const [tab, setTab] = useState<Tab>("matches");

  // Se non c'è un torneo salvato → torna al setup.
  useEffect(() => {
    if (loaded && !state) {
      void navigate({ to: "/" });
    }
  }, [loaded, state, navigate]);

  if (!loaded || !state) return null;

  const { players, matches } = state;
  const liveRounds = rebuildLiveRounds(players, matches);
  const standings = computeStandings(players, matches);
  const done = matches.filter((m) => m.winner).length;
  const total = matches.length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  const handleScoreChange = (match: Match, field: "score1" | "score2", value: string) => {
    const next = applyScoreUpdate(match, field, value);
    if (next) updateMatch(next);
  };

  const handleReset = () => {
    if (typeof window !== "undefined" && !window.confirm("Resettare il torneo?")) return;
    resetMatches();
  };

  const handleNewTournament = () => {
    if (
      typeof window !== "undefined" &&
      !window.confirm("Iniziare un nuovo torneo? Verrà cancellato quello attuale.")
    )
      return;
    clearTournament();
  };

  return (
    <div className="min-h-screen bg-background text-foreground safe-x">
      <Header
        playersCount={players.length}
        done={done}
        total={total}
        pct={pct}
        tab={tab}
        onTab={setTab}
        onReset={handleReset}
      />

      <main className="mx-auto max-w-3xl px-3 py-5 sm:px-4 sm:py-6 safe-bottom">
        {tab === "matches" && (
          <MatchesView
            rounds={liveRounds}
            players={players}
            onScoreChange={handleScoreChange}
          />
        )}

        {tab === "standings" && (
          <StandingsView
            standings={standings}
            players={players}
            allDone={done === total && total > 0}
          />
        )}

        {tab === "players" && (
          <PlayersTab
            currentPlayers={players}
            onReplace={replacePlayers}
            onRename={renamePlayers}
            onNewTournament={handleNewTournament}
          />
        )}
      </main>

      {savedFlash && (
        <div className="saved-toast" role="status" aria-live="polite">
          ✓ Salvato
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────  HEADER  ───────────────────────────── */

function Header({
  playersCount,
  done,
  total,
  pct,
  tab,
  onTab,
  onReset,
}: {
  playersCount: number;
  done: number;
  total: number;
  pct: number;
  tab: Tab;
  onTab: (t: Tab) => void;
  onReset: () => void;
}) {
  const tabs: { id: Tab; label: string }[] = [
    { id: "matches", label: "⚡ Partite" },
    { id: "standings", label: "🏆 Classifica" },
    { id: "players", label: "👥 Giocatori" },
  ];

  return (
    <header
      className="sticky top-0 z-50 border-b border-border safe-top"
      style={{ background: "var(--gradient-header)" }}
    >
      <div className="mx-auto max-w-3xl px-3 pt-3 sm:px-4 sm:pt-4">
        {/* Riga 1: logo + titolo + reset compatto a destra */}
        <div className="mb-2 flex items-center gap-3">
          <span className="neon-logo text-2xl sm:text-3xl" aria-hidden>
            🏓
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="neon-title text-base font-black leading-none sm:text-xl">
              PING PONG
            </h1>
            <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground sm:tracking-[0.25em]">
              {playersCount} Giocatori · A {WIN_SCORE}
            </p>
          </div>
          <button
            type="button"
            onClick={onReset}
            aria-label="Reset torneo"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
          >
            <span aria-hidden className="text-base">
              ↺
            </span>
          </button>
        </div>

        {/* Riga 2: barra di progresso a tutta larghezza */}
        <div className="mb-2 flex items-center gap-2">
          <div className="progress-bar flex-1">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground tabular-nums">
            {done}/{total} · {pct}%
          </span>
        </div>

        {/* Riga 3: tab scrollabili orizzontalmente */}
        <div className="-mx-3 sm:-mx-4">
          <div className="scrollbar-hidden flex items-center gap-1 overflow-x-auto px-3 sm:px-4">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onTab(t.id)}
                className={`nav-tab ${tab === t.id ? "active" : ""}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}

/* ─────────────────────────────  MATCHES  ──────────────────────────── */

function MatchesView({
  rounds,
  players,
  onScoreChange,
}: {
  rounds: ReturnType<typeof rebuildLiveRounds>;
  players: string[];
  onScoreChange: (m: Match, field: "score1" | "score2", value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      {rounds.map(({ round, matches: ms, resting }) => {
        const completed = ms.filter((m) => m.winner).length;
        const allDone = completed === ms.length && ms.length > 0;
        return (
          <section key={round} className={`round-block ${allDone ? "is-done" : ""}`}>
            <div className="round-header">
              <span className="round-badge">TURNO {round}</span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {completed}/{ms.length} completate
              </span>
              {allDone && (
                <span className="ml-auto text-[9px] font-bold uppercase tracking-widest text-neon-lime">
                  ✓ Completato
                </span>
              )}
            </div>

            {resting && (
              <div className="flex items-center gap-2 border-b border-border bg-surface-1 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                <span aria-hidden>🛋️</span>
                <span>Riposa:</span>
                <span
                  className="player-dot"
                  style={{ backgroundColor: colorFor(players, resting) }}
                />
                <span style={{ color: colorFor(players, resting) }}>{resting}</span>
              </div>
            )}

            {ms.map((m) => (
              <MatchRow key={m.id} match={m} players={players} onScoreChange={onScoreChange} />
            ))}
          </section>
        );
      })}
    </div>
  );
}

function MatchRow({
  match,
  players,
  onScoreChange,
}: {
  match: Match;
  players: string[];
  onScoreChange: (m: Match, field: "score1" | "score2", value: string) => void;
}) {
  const c1 = colorFor(players, match.p1);
  const c2 = colorFor(players, match.p2);
  const winner = match.winner;

  const inputStyle = (isWinner: boolean, color: string) =>
    isWinner
      ? {
          borderColor: color,
          color,
          boxShadow: `0 0 12px ${color}55`,
        }
      : undefined;

  return (
    <div className={`match-card ${winner ? "is-done" : ""}`}>
      {/* P1 */}
      <div className="player-side">
        <span className="player-dot" style={{ backgroundColor: c1 }} />
        <span className="player-name" style={{ color: winner === match.p1 ? c1 : undefined }}>
          {match.p1}
        </span>
        {winner === match.p1 && <span aria-hidden>🏆</span>}
      </div>

      {/* Score */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="numeric"
          aria-label={`Punteggio ${match.p1}`}
          value={match.score1}
          onChange={(e) => onScoreChange(match, "score1", e.target.value)}
          className={`score-input ${
            winner === match.p2 ? "is-loser" : ""
          }`}
          style={inputStyle(winner === match.p1, c1)}
        />
        <span className="text-xl font-black text-muted-foreground">:</span>
        <input
          type="text"
          inputMode="numeric"
          aria-label={`Punteggio ${match.p2}`}
          value={match.score2}
          onChange={(e) => onScoreChange(match, "score2", e.target.value)}
          className={`score-input ${
            winner === match.p1 ? "is-loser" : ""
          }`}
          style={inputStyle(winner === match.p2, c2)}
        />
      </div>

      {/* P2 */}
      <div className="player-side right">
        {winner === match.p2 && <span aria-hidden>🏆</span>}
        <span className="player-name" style={{ color: winner === match.p2 ? c2 : undefined }}>
          {match.p2}
        </span>
        <span className="player-dot" style={{ backgroundColor: c2 }} />
      </div>
    </div>
  );
}

/* ───────────────────────────  STANDINGS  ──────────────────────────── */

function StandingsView({
  standings,
  players,
  allDone,
}: {
  standings: ReturnType<typeof computeStandings>;
  players: string[];
  allDone: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      {allDone && standings[0] && (
        <div className="champion-banner">
          🎉 Campione:{" "}
          <span style={{ color: colorFor(players, standings[0].player) }}>
            {standings[0].player}
          </span>{" "}
          🎉
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {["#", "Giocatore", "G", "V", "P", "PF", "PS", "+/−"].map((h) => (
                <th
                  key={h}
                  className="border-b border-border px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-muted-foreground"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => {
              const diff = s.pf - s.pa;
              const color = colorFor(players, s.player);
              return (
                <tr
                  key={s.player}
                  className={`standings-row border-b border-border last:border-b-0 ${
                    i === 0 ? "is-top" : ""
                  }`}
                >
                  <td className="px-3 py-3 text-center text-base font-black">
                    {MEDALS[i] ?? i + 1}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className="player-dot" style={{ backgroundColor: color }} />
                      <span className="font-bold" style={{ color }}>
                        {s.player}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">{s.played}</td>
                  <td className="px-3 py-3 text-center font-bold text-neon-lime">{s.wins}</td>
                  <td className="px-3 py-3 text-center text-muted-foreground">{s.losses}</td>
                  <td className="px-3 py-3 text-center">{s.pf}</td>
                  <td className="px-3 py-3 text-center">{s.pa}</td>
                  <td
                    className="px-3 py-3 text-center font-bold"
                    style={{ color: diff >= 0 ? "var(--neon-lime)" : "var(--neon-red)" }}
                  >
                    {diff > 0 ? "+" : ""}
                    {diff}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {standings.map((s, i) => {
          const color = colorFor(players, s.player);
          const winRate = s.played > 0 ? Math.round((s.wins / s.played) * 100) : 0;
          return (
            <div
              key={s.player}
              className="rounded-2xl border bg-card p-4 transition-transform hover:-translate-y-1"
              style={{ borderColor: i === 0 ? "var(--neon-gold)" : "var(--color-border)" }}
            >
              <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                {MEDALS[i] ?? `#${i + 1}`}
              </div>
              <div className="mb-3 text-lg font-black" style={{ color }}>
                {s.player}
              </div>
              <div className="mb-3 grid grid-cols-3 gap-2 text-center">
                <MiniStat color="var(--neon-lime)" value={s.wins} label="Vinte" />
                <MiniStat color="var(--neon-red)" value={s.losses} label="Perse" />
                <MiniStat color="var(--neon-cyan)" value={s.pf} label="PF" />
              </div>
              <div className="mb-1 h-1 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${winRate}%`,
                    background: `linear-gradient(90deg, ${color}, var(--neon-lime))`,
                  }}
                />
              </div>
              <div className="text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {winRate}% win rate
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MiniStat({ color, value, label }: { color: string; value: number; label: string }) {
  return (
    <div>
      <div className="text-base font-black" style={{ color }}>
        {value}
      </div>
      <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

/* ────────────────────────  PLAYERS TAB  ──────────────────────────── */

function PlayersTab({
  currentPlayers,
  onReplace,
  onRename,
  onNewTournament,
}: {
  currentPlayers: string[];
  onReplace: (next: string[]) => void;
  onRename: (oldNames: string[], newNames: string[]) => void;
  onNewTournament: () => void;
}) {
  const [draft, setDraft] = useState<string[]>(currentPlayers);

  const trimmed = useMemo(() => draft.map((d) => d.trim()), [draft]);
  const error = validatePlayers(trimmed);

  const sameLength = trimmed.length === currentPlayers.length;
  const isPureRename = sameLength && !error;

  const hasChanges = useMemo(() => {
    if (trimmed.length !== currentPlayers.length) return true;
    return trimmed.some((n, i) => n !== currentPlayers[i]);
  }, [trimmed, currentPlayers]);

  const handleSave = () => {
    if (error || !hasChanges) return;
    if (isPureRename) {
      onRename(currentPlayers, trimmed);
      return;
    }
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        "Cambiare la rosa azzererà il torneo (i punteggi attuali andranno persi). Continuare?",
      )
    )
      return;
    onReplace(trimmed);
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-border bg-card/60 p-4 sm:p-5">
        <h2 className="mb-3 text-[11px] font-black uppercase tracking-[0.25em] text-neon-cyan">
          ▸ Modifica Rosa
        </h2>
        <PlayersEditor players={draft} onChange={setDraft} />

        <div className="mt-4 space-y-2">
          {hasChanges && !error && (
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {isPureRename
                ? "✓ Solo rinomina · I punteggi saranno mantenuti"
                : "⚠ Cambio rosa · Il torneo verrà azzerato"}
            </p>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!!error || !hasChanges}
            className="w-full rounded-xl border-2 border-neon-cyan bg-neon-cyan/10 py-3 text-[11px] font-black uppercase tracking-[0.3em] text-neon-cyan transition-all hover:bg-neon-cyan/20 disabled:cursor-not-allowed disabled:border-border disabled:bg-transparent disabled:text-muted-foreground"
          >
            💾 Salva Modifiche
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card/40 p-4 sm:p-5">
        <h2 className="mb-3 text-[11px] font-black uppercase tracking-[0.25em] text-destructive">
          ▸ Zona Pericolo
        </h2>
        <button
          type="button"
          onClick={onNewTournament}
          className="w-full rounded-xl border border-destructive/60 bg-transparent py-3 text-[11px] font-black uppercase tracking-[0.3em] text-destructive transition-colors hover:bg-destructive/10"
        >
          🗑 Nuovo Torneo (cancella tutto)
        </button>
      </section>
    </div>
  );
}
