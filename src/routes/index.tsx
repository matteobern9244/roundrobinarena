import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { PlayersEditor } from "@/components/PlayersEditor";
import { useTournament } from "@/hooks/useTournament";
import {
  DEFAULT_PLAYERS,
  generateRounds,
  validatePlayers,
  WIN_SCORE,
} from "@/lib/tournament";

export const Route = createFileRoute("/")({
  component: SetupPage,
});

function SetupPage() {
  const navigate = useNavigate();
  const { loaded, state, startTournament } = useTournament();
  const [players, setPlayers] = useState<string[]>(DEFAULT_PLAYERS);

  // Se esiste un torneo salvato → vai direttamente al torneo.
  useEffect(() => {
    if (loaded && state) {
      void navigate({ to: "/tournament" });
    }
  }, [loaded, state, navigate]);

  const trimmed = useMemo(() => players.map((p) => p.trim()), [players]);
  const error = validatePlayers(trimmed);

  const preview = useMemo(() => {
    if (error) return null;
    const rounds = generateRounds(trimmed);
    const totalMatches = rounds.reduce((acc, r) => acc + r.matches.length, 0);
    const isOdd = trimmed.length % 2 === 1;
    return { rounds: rounds.length, totalMatches, isOdd };
  }, [trimmed, error]);

  const handleStart = () => {
    if (error) return;
    startTournament(trimmed);
    void navigate({ to: "/tournament" });
  };

  // Evita un flash della pagina setup se sta per fare redirect.
  if (loaded && state) {
    return null;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-5 px-3 py-6 safe-x safe-bottom sm:gap-6 sm:px-4 sm:py-8">
      <div className="safe-top" />
      <header className="flex flex-col items-center gap-3 text-center">
        <span className="neon-logo text-5xl" aria-hidden>
          🏓
        </span>
        <h1 className="neon-title text-2xl font-black sm:text-3xl">PING PONG</h1>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
          Nuovo Torneo · All vs All · Partita a {WIN_SCORE}
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-card/60 p-4 sm:p-5">
        <h2 className="mb-3 text-[11px] font-black uppercase tracking-[0.25em] text-neon-cyan">
          ▸ Giocatori
        </h2>
        <PlayersEditor players={players} onChange={setPlayers} />
      </section>

      {preview && (
        <section
          aria-live="polite"
          className="rounded-2xl border border-border bg-card/60 p-4 text-center"
        >
          <div className="grid grid-cols-3 gap-2">
            <Stat value={trimmed.length} label="Giocatori" />
            <Stat value={preview.rounds} label="Turni" />
            <Stat value={preview.totalMatches} label="Partite" />
          </div>
          {preview.isOdd && (
            <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-neon-gold">
              🛋️ Numero dispari · Un giocatore riposerà ogni turno
            </p>
          )}
        </section>
      )}

      <button
        type="button"
        onClick={handleStart}
        disabled={!!error}
        className="w-full rounded-2xl border-2 border-neon-cyan bg-neon-cyan/10 py-4 text-sm font-black uppercase tracking-[0.3em] text-neon-cyan transition-all hover:bg-neon-cyan/20 disabled:cursor-not-allowed disabled:border-border disabled:bg-transparent disabled:text-muted-foreground"
        style={
          !error
            ? { boxShadow: "var(--glow-cyan)" }
            : undefined
        }
      >
        ⚡ Inizia Torneo
      </button>

      <footer className="text-center text-[10px] uppercase tracking-widest text-muted-foreground/60">
        I dati restano solo sul tuo dispositivo
      </footer>
    </main>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="text-2xl font-black text-foreground">{value}</div>
      <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
