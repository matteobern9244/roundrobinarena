import { useMemo } from "react";
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  PLAYER_COLORS,
  validatePlayers,
} from "@/lib/tournament";

type Props = {
  players: string[];
  onChange: (next: string[]) => void;
  /** Mostra l'errore inline se !== null. Esposto anche tramite onValidityChange. */
  showError?: boolean;
};

export function PlayersEditor({ players, onChange, showError = true }: Props) {
  const error = useMemo(() => validatePlayers(players), [players]);

  const setName = (idx: number, value: string) => {
    const next = [...players];
    next[idx] = value;
    onChange(next);
  };

  const remove = (idx: number) => {
    if (players.length <= MIN_PLAYERS) return;
    const next = players.filter((_, i) => i !== idx);
    onChange(next);
  };

  const add = () => {
    if (players.length >= MAX_PLAYERS) return;
    onChange([...players, ""]);
  };

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {players.map((name, idx) => {
          const color = PLAYER_COLORS[idx % PLAYER_COLORS.length];
          return (
            <li
              key={idx}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2"
            >
              <span
                aria-hidden
                className="h-3 w-3 flex-shrink-0 rounded-full"
                style={{
                  backgroundColor: color,
                  boxShadow: `0 0 10px ${color}80`,
                }}
              />
              <span className="w-6 text-xs font-bold text-muted-foreground">
                {String(idx + 1).padStart(2, "0")}
              </span>
              <input
                type="text"
                value={name}
                placeholder={`Giocatore ${idx + 1}`}
                maxLength={18}
                onChange={(e) => setName(idx, e.target.value)}
                className="flex-1 bg-transparent font-mono text-sm font-bold tracking-wide text-foreground outline-none placeholder:text-muted-foreground/50"
              />
              <button
                type="button"
                onClick={() => remove(idx)}
                disabled={players.length <= MIN_PLAYERS}
                aria-label={`Rimuovi ${name || `giocatore ${idx + 1}`}`}
                className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-destructive hover:text-destructive disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-border disabled:hover:text-muted-foreground"
              >
                ✕
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={add}
        disabled={players.length >= MAX_PLAYERS}
        className="w-full rounded-xl border-2 border-dashed border-border bg-transparent py-3 text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:border-neon-cyan hover:text-neon-cyan disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-muted-foreground"
      >
        + Aggiungi giocatore ({players.length}/{MAX_PLAYERS})
      </button>

      {showError && error && (
        <p className="text-xs font-bold tracking-wide text-destructive">⚠ {error}</p>
      )}
    </div>
  );
}
