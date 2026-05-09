// Tournament domain: types, constants, round-robin generator, standings computation.

export const WIN_SCORE = 11;
export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 8;
export const STORAGE_KEY = "pp-tournament-v1";

// 8 colori predefiniti, assegnati per posizione nella rosa.
export const PLAYER_COLORS = [
  "#ff6b35", // arancio
  "#00d9ff", // ciano
  "#7fff00", // verde lime
  "#ff2d87", // magenta
  "#ffd700", // oro
  "#bf7fff", // viola
  "#ffb085", // rosa pesca
  "#85d8ff", // azzurro ghiaccio
];

export const MEDALS = ["🥇", "🥈", "🥉"];

export const DEFAULT_PLAYERS = [
  "Fabio",
  "Matteo",
  "Christian",
  "Cristina",
  "Daniele",
  "Adriano",
];

export type ServerSide = "p1" | "p2";

export type Match = {
  id: string;
  round: number;
  p1: string;
  p2: string;
  score1: string;
  score2: string;
  winner: string | null;
  /** Chi ha vinto il punto fittizio iniziale "per la palla". Modificabile solo a 0–0. */
  firstServer?: ServerSide | null;
};

export const SERVE_SWITCH_EVERY = 5;

/** Punti totali "veri" giocati nel match (esclude il punto fittizio per la palla). */
export function matchTotalPoints(match: Match): number {
  const s1 = parseInt(match.score1, 10);
  const s2 = parseInt(match.score2, 10);
  return (Number.isNaN(s1) ? 0 : s1) + (Number.isNaN(s2) ? 0 : s2);
}

/** Restituisce chi è al servizio in questo momento, o null se nessuno. */
export function currentServer(match: Match): ServerSide | null {
  if (match.winner) return null;
  if (!match.firstServer) return null;
  const total = matchTotalPoints(match);
  const switches = Math.floor(total / SERVE_SWITCH_EVERY);
  const flipped: ServerSide = match.firstServer === "p1" ? "p2" : "p1";
  return switches % 2 === 0 ? match.firstServer : flipped;
}

export type Round = {
  round: number;
  matches: Match[];
  resting: string | null;
};

export type TournamentState = {
  players: string[];
  matches: Match[];
};

export type Standing = {
  player: string;
  wins: number;
  losses: number;
  pf: number;
  pa: number;
  played: number;
};

const BYE = "__BYE__";

/** Fisher-Yates shuffle — crea una copia mescolata casualmente. */
export function shufflePlayers<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Berger round-robin DETERMINISTICO con supporto per N dispari (slot BYE).
 * L'ordine dei giocatori in input determina i match: per avere accoppiamenti
 * casuali, mescola la lista PRIMA di chiamare questa funzione (vedi
 * `buildFreshMatches`) e persisti l'ordine mescolato — altrimenti gli ID
 * dei match cambierebbero ad ogni render rompendo la persistenza dei punteggi.
 */
export function generateRounds(players: string[]): Round[] {
  const list = [...players];
  if (list.length < 2) return [];
  if (list.length % 2 === 1) list.push(BYE);

  const n = list.length;
  const rotating = list.slice(1); // primo elemento fisso, gli altri ruotano
  const rounds: Round[] = [];

  for (let r = 0; r < n - 1; r++) {
    const slots = [list[0], ...rotating];
    const matches: Match[] = [];
    let resting: string | null = null;

    for (let i = 0; i < n / 2; i++) {
      const a = slots[i];
      const b = slots[n - 1 - i];
      if (a === BYE) {
        resting = b;
        continue;
      }
      if (b === BYE) {
        resting = a;
        continue;
      }
      // id stabile e indipendente dall'ordine: ordino alfabeticamente i nomi
      const [pa, pb] = [a, b].sort();
      matches.push({
        id: `r${r + 1}-${pa}__${pb}`,
        round: r + 1,
        p1: a,
        p2: b,
        score1: "",
        score2: "",
        winner: null,
      });
    }

    rounds.push({ round: r + 1, matches, resting });

    // ruota: l'ultimo va in testa di "rotating"
    rotating.unshift(rotating.pop() as string);
  }

  return rounds;
}

export function buildFreshMatches(players: string[]): Match[] {
  return generateRounds(players).flatMap((r) => r.matches);
}

export function computeStandings(players: string[], matches: Match[]): Standing[] {
  const map: Record<string, Standing> = {};
  players.forEach((p) => {
    map[p] = { player: p, wins: 0, losses: 0, pf: 0, pa: 0, played: 0 };
  });

  matches.forEach((m) => {
    if (!m.winner) return;
    if (!map[m.p1] || !map[m.p2]) return;
    const v1 = parseInt(m.score1, 10);
    const v2 = parseInt(m.score2, 10);
    if (Number.isNaN(v1) || Number.isNaN(v2)) return;

    const loser = m.winner === m.p1 ? m.p2 : m.p1;
    map[m.winner].wins++;
    map[m.winner].played++;
    map[loser].losses++;
    map[loser].played++;

    map[m.p1].pf += v1;
    map[m.p1].pa += v2;
    map[m.p2].pf += v2;
    map[m.p2].pa += v1;
  });

  return Object.values(map).sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    const da = a.pf - a.pa;
    const db = b.pf - b.pa;
    if (db !== da) return db - da;
    return b.pf - a.pf;
  });
}

export function colorFor(players: string[], name: string): string {
  const idx = players.indexOf(name);
  if (idx < 0) return "#ffffff";
  return PLAYER_COLORS[idx % PLAYER_COLORS.length];
}

/** Aggiorna un singolo match con un nuovo score e ricalcola il vincitore. */
export function applyScoreUpdate(
  match: Match,
  field: "score1" | "score2",
  rawValue: string,
): Match | null {
  const cleaned = rawValue.replace(/\D/g, "").slice(0, 2);
  if (cleaned !== "") {
    const n = parseInt(cleaned, 10);
    if (n < 0 || n > WIN_SCORE) return null;
  }
  const next: Match = { ...match, [field]: cleaned };
  const s1 = parseInt(next.score1, 10);
  const s2 = parseInt(next.score2, 10);

  if (!Number.isNaN(s1) && !Number.isNaN(s2)) {
    if (s1 === WIN_SCORE && s2 < WIN_SCORE) next.winner = next.p1;
    else if (s2 === WIN_SCORE && s1 < WIN_SCORE) next.winner = next.p2;
    else next.winner = null;
  } else {
    next.winner = null;
  }
  return next;
}

export function validatePlayers(names: string[]): string | null {
  const trimmed = names.map((n) => n.trim());
  if (trimmed.length < MIN_PLAYERS) return `Servono almeno ${MIN_PLAYERS} giocatori`;
  if (trimmed.length > MAX_PLAYERS) return `Massimo ${MAX_PLAYERS} giocatori`;
  if (trimmed.some((n) => n === "")) return "I nomi non possono essere vuoti";
  const lower = trimmed.map((n) => n.toLowerCase());
  if (new Set(lower).size !== lower.length) return "I nomi devono essere unici";
  return null;
}

export function rebuildLiveRounds(players: string[], matches: Match[]): Round[] {
  const skeleton = generateRounds(players);
  const byId = new Map(matches.map((m) => [m.id, m]));
  return skeleton.map((r) => ({
    ...r,
    matches: r.matches.map((m) => byId.get(m.id) ?? m),
  }));
}
