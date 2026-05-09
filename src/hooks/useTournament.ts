import { useCallback, useEffect, useState } from "react";
import {
  buildFreshMatches,
  DEFAULT_PLAYERS,
  shufflePlayers,
  STORAGE_KEY,
  type Match,
  type TournamentState,
} from "@/lib/tournament";

const isBrowser = typeof window !== "undefined";

function readStorage(): TournamentState | null {
  if (!isBrowser) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TournamentState>;
    if (!parsed?.players?.length || !Array.isArray(parsed.matches)) return null;
    return { players: parsed.players, matches: parsed.matches as Match[] };
  } catch {
    return null;
  }
}

function writeStorage(state: TournamentState | null) {
  if (!isBrowser) return;
  try {
    if (state === null) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota / privacy errors */
  }
}

export type UseTournament = {
  loaded: boolean;
  state: TournamentState | null;
  savedFlash: boolean;
  startTournament: (players: string[]) => void;
  resetMatches: () => void;
  clearTournament: () => void;
  updateMatch: (next: Match) => void;
  assignServer: (matchId: string, server: "p1" | "p2") => void;
  replacePlayers: (players: string[]) => void;
  renamePlayers: (oldNames: string[], newNames: string[]) => void;
};

export function useTournament(): UseTournament {
  const [state, setState] = useState<TournamentState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setState(readStorage());
    setLoaded(true);
  }, []);

  const persist = useCallback((next: TournamentState | null) => {
    writeStorage(next);
    if (next) {
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 1400);
    }
  }, []);

  const startTournament = useCallback(
    (players: string[]) => {
      const shuffled = shufflePlayers(players);
      const next: TournamentState = { players: shuffled, matches: buildFreshMatches(shuffled) };
      setState(next);
      persist(next);
    },
    [persist],
  );

  const resetMatches = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev;
      const next: TournamentState = {
        players: prev.players,
        matches: buildFreshMatches(prev.players),
      };
      persist(next);
      return next;
    });
  }, [persist]);

  const clearTournament = useCallback(() => {
    setState(null);
    persist(null);
    if (isBrowser) window.localStorage.removeItem(STORAGE_KEY);
  }, [persist]);

  const updateMatch = useCallback(
    (nextMatch: Match) => {
      setState((prev) => {
        if (!prev) return prev;
        const next: TournamentState = {
          players: prev.players,
          matches: prev.matches.map((m) => (m.id === nextMatch.id ? nextMatch : m)),
        };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const replacePlayers = useCallback(
    (players: string[]) => {
      const shuffled = shufflePlayers(players);
      const next: TournamentState = { players: shuffled, matches: buildFreshMatches(shuffled) };
      setState(next);
      persist(next);
    },
    [persist],
  );

  // Rename: stessa lunghezza/ordine, solo nomi diversi → mantiene punteggi.
  const renamePlayers = useCallback(
    (oldNames: string[], newNames: string[]) => {
      setState((prev) => {
        if (!prev) return prev;
        if (oldNames.length !== newNames.length) return prev;
        const map = new Map<string, string>();
        oldNames.forEach((o, i) => map.set(o, newNames[i]));
        const renamedMatches: Match[] = prev.matches.map((m) => ({
          ...m,
          p1: map.get(m.p1) ?? m.p1,
          p2: map.get(m.p2) ?? m.p2,
          winner: m.winner ? (map.get(m.winner) ?? m.winner) : null,
        }));
        const next: TournamentState = { players: newNames, matches: renamedMatches };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  // Assegna il "first server" — consentito solo a 0–0 e match non concluso.
  const assignServer = useCallback(
    (matchId: string, server: "p1" | "p2") => {
      setState((prev) => {
        if (!prev) return prev;
        const matches = prev.matches.map((m) => {
          if (m.id !== matchId) return m;
          if (m.winner) return m;
          const s1 = parseInt(m.score1, 10);
          const s2 = parseInt(m.score2, 10);
          const total = (Number.isNaN(s1) ? 0 : s1) + (Number.isNaN(s2) ? 0 : s2);
          if (total !== 0) return m;
          return { ...m, firstServer: server };
        });
        const next: TournamentState = { players: prev.players, matches };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  return {
    loaded,
    state,
    savedFlash,
    startTournament,
    resetMatches,
    clearTournament,
    updateMatch,
    assignServer,
    replacePlayers,
    renamePlayers,
  };
}

export const FALLBACK_DEFAULT_PLAYERS = DEFAULT_PLAYERS;
