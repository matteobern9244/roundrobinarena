import { describe, expect, it } from "vitest";
import {
  applyScoreUpdate,
  buildFreshMatches,
  colorFor,
  computeStandings,
  currentServer,
  generateRounds,
  MAX_PLAYERS,
  MIN_PLAYERS,
  PLAYER_COLORS,
  rebuildLiveRounds,
  shufflePlayers,
  validatePlayers,
  WIN_SCORE,
  type Match,
} from "./tournament";

const names = (n: number) => Array.from({ length: n }, (_, i) => `P${i + 1}`);

function pairKey(m: Match): string {
  return [m.p1, m.p2].sort().join("|");
}

function played(match: Match, score1: number, score2: number): Match {
  const withFirst = applyScoreUpdate(match, "score1", String(score1));
  if (!withFirst) throw new Error("score1 rifiutato");
  const withBoth = applyScoreUpdate(withFirst, "score2", String(score2));
  if (!withBoth) throw new Error("score2 rifiutato");
  return withBoth;
}

describe("generateRounds", () => {
  it.each([4, 6, 8, 10, 12])(
    "con %i giocatori (pari) genera N-1 turni da N/2 partite senza riposi",
    (n) => {
      const rounds = generateRounds(names(n));
      expect(rounds).toHaveLength(n - 1);
      for (const round of rounds) {
        expect(round.matches).toHaveLength(n / 2);
        expect(round.resting).toBeNull();
      }
    },
  );

  it.each([3, 5, 7, 9, 11])(
    "con %i giocatori (dispari) genera N turni da (N-1)/2 partite e un riposo per turno",
    (n) => {
      const rounds = generateRounds(names(n));
      expect(rounds).toHaveLength(n);
      for (const round of rounds) {
        expect(round.matches).toHaveLength((n - 1) / 2);
        expect(round.resting).not.toBeNull();
      }
      const resting = rounds.map((r) => r.resting);
      expect(new Set(resting).size).toBe(n);
    },
  );

  it.each([3, 4, 5, 6, 7, 8, 12])(
    "con %i giocatori ogni coppia si affronta esattamente una volta",
    (n) => {
      const matches = buildFreshMatches(names(n));
      expect(matches).toHaveLength((n * (n - 1)) / 2);
      expect(new Set(matches.map(pairKey)).size).toBe(matches.length);
    },
  );

  it("in ogni turno nessun giocatore compare due volte", () => {
    for (const round of generateRounds(names(7))) {
      const inRound = round.matches.flatMap((m) => [m.p1, m.p2]);
      if (round.resting) inRound.push(round.resting);
      expect(new Set(inRound).size).toBe(inRound.length);
    }
  });

  it("e' deterministico e produce ID indipendenti dall'ordine dei due giocatori", () => {
    const first = buildFreshMatches(names(6)).map((m) => m.id);
    const second = buildFreshMatches(names(6)).map((m) => m.id);
    expect(second).toEqual(first);
    for (const m of buildFreshMatches(names(6))) {
      const [a, b] = [m.p1, m.p2].sort();
      expect(m.id).toBe(`r${m.round}-${a}__${b}`);
    }
  });

  it("con meno di due giocatori non genera turni", () => {
    expect(generateRounds([])).toEqual([]);
    expect(generateRounds(["Solo"])).toEqual([]);
  });

  it("non modifica la lista in ingresso", () => {
    const input = names(5);
    generateRounds(input);
    expect(input).toEqual(names(5));
  });
});

describe("applyScoreUpdate", () => {
  const base = buildFreshMatches(["Anna", "Bruno", "Carla", "Dario"])[0];

  it(`assegna la vittoria a chi arriva a ${WIN_SCORE} con l'altro sotto`, () => {
    expect(played(base, WIN_SCORE, 7).winner).toBe(base.p1);
    expect(played(base, 9, WIN_SCORE).winner).toBe(base.p2);
  });

  it("non assegna vincitori se manca uno dei due punteggi o nessuno e' a 11", () => {
    expect(applyScoreUpdate(base, "score1", "11")?.winner).toBeNull();
    expect(played(base, 10, 8).winner).toBeNull();
  });

  it("toglie il vincitore quando il punteggio viene corretto", () => {
    const won = played(base, WIN_SCORE, 3);
    expect(applyScoreUpdate(won, "score1", "10")?.winner).toBeNull();
  });

  it("ripulisce l'input lasciando al massimo due cifre", () => {
    expect(applyScoreUpdate(base, "score1", "a7b")?.score1).toBe("7");
    expect(applyScoreUpdate(base, "score2", "")?.score2).toBe("");
  });

  it(`rifiuta punteggi oltre ${WIN_SCORE}`, () => {
    expect(applyScoreUpdate(base, "score1", "12")).toBeNull();
    expect(applyScoreUpdate(base, "score1", "999")).toBeNull();
  });
});

describe("computeStandings", () => {
  const players = ["Anna", "Bruno", "Carla"];

  it("conta vittorie, sconfitte, punti fatti e subiti solo per partite concluse", () => {
    const [m1, m2, m3] = buildFreshMatches(players);
    const results = [played(m1, 11, 5), played(m2, 11, 9), m3];
    const standings = computeStandings(players, results);
    const totalWins = standings.reduce((sum, s) => sum + s.wins, 0);
    const totalPlayed = standings.reduce((sum, s) => sum + s.played, 0);
    expect(totalWins).toBe(2);
    expect(totalPlayed).toBe(4);
    const pf = standings.reduce((sum, s) => sum + s.pf, 0);
    const pa = standings.reduce((sum, s) => sum + s.pa, 0);
    expect(pf).toBe(11 + 5 + 11 + 9);
    expect(pa).toBe(pf);
  });

  it("ordina per vittorie, poi differenza punti, poi punti fatti", () => {
    const mk = (p1: string, p2: string, s1: number, s2: number): Match =>
      played({ id: `${p1}-${p2}`, round: 1, p1, p2, score1: "", score2: "", winner: null }, s1, s2);
    const roster = ["A", "B", "C", "D"];
    const matches = [
      mk("A", "B", 11, 9), // A +2
      mk("C", "D", 11, 1), // C +10
      mk("B", "D", 11, 0), // B +11
    ];
    const order = computeStandings(roster, matches).map((s) => s.player);
    // A e C hanno 1 vittoria: C ha differenza migliore. B ha 1 vittoria e differenza +9.
    expect(order).toEqual(["C", "B", "A", "D"]);
  });

  it("a parita' di vittorie e differenza vince chi ha fatto piu' punti", () => {
    const mk = (p1: string, p2: string, s1: number, s2: number): Match =>
      played({ id: `${p1}-${p2}`, round: 1, p1, p2, score1: "", score2: "", winner: null }, s1, s2);
    const matches = [mk("A", "X", 11, 9), mk("B", "Y", 11, 9)];
    // stessa differenza (+2) e stessi punti: l'ordine stabile mantiene A prima di B
    expect(
      computeStandings(["A", "B", "X", "Y"], matches)
        .slice(0, 2)
        .map((s) => s.player),
    ).toEqual(["A", "B"]);
  });

  it("ignora partite con giocatori non in rosa", () => {
    const ghost: Match = {
      id: "g",
      round: 1,
      p1: "Anna",
      p2: "Zeno",
      score1: "11",
      score2: "0",
      winner: "Anna",
    };
    const standings = computeStandings(players, [ghost]);
    expect(standings.every((s) => s.played === 0)).toBe(true);
  });
});

describe("currentServer", () => {
  const base: Match = { id: "m", round: 1, p1: "A", p2: "B", score1: "", score2: "", winner: null };

  it("e' null finche' non si sa chi ha vinto la palla", () => {
    expect(currentServer(base)).toBeNull();
  });

  it("cambia servizio ogni 5 punti", () => {
    const at = (s1: string, s2: string) =>
      currentServer({ ...base, firstServer: "p1", score1: s1, score2: s2 });
    expect(at("", "")).toBe("p1");
    expect(at("2", "2")).toBe("p1");
    expect(at("3", "2")).toBe("p2");
    expect(at("5", "5")).toBe("p1");
  });

  it("e' null a partita conclusa", () => {
    expect(
      currentServer({ ...base, firstServer: "p1", score1: "11", score2: "2", winner: "A" }),
    ).toBeNull();
  });
});

describe("validatePlayers", () => {
  it("accetta una rosa valida", () => {
    expect(validatePlayers(names(MIN_PLAYERS))).toBeNull();
    expect(validatePlayers(names(MAX_PLAYERS))).toBeNull();
  });

  it("rifiuta rose troppo corte o troppo lunghe", () => {
    expect(validatePlayers(names(MIN_PLAYERS - 1))).toMatch(/almeno/);
    expect(validatePlayers(names(MAX_PLAYERS + 1))).toMatch(/Massimo/);
  });

  it("rifiuta nomi vuoti e duplicati senza distinguere maiuscole", () => {
    expect(validatePlayers(["Anna", " ", "Carla"])).toMatch(/vuoti/);
    expect(validatePlayers(["Anna", "anna ", "Carla"])).toMatch(/unici/);
  });
});

describe("utilita'", () => {
  it("shufflePlayers restituisce una permutazione senza toccare l'originale", () => {
    const input = names(8);
    const shuffled = shufflePlayers(input);
    expect(input).toEqual(names(8));
    expect([...shuffled].sort()).toEqual([...input].sort());
  });

  it("colorFor assegna i colori per posizione e un bianco per chi non e' in rosa", () => {
    const roster = names(PLAYER_COLORS.length + 1);
    expect(colorFor(roster, "P1")).toBe(PLAYER_COLORS[0]);
    expect(colorFor(roster, `P${PLAYER_COLORS.length + 1}`)).toBe(PLAYER_COLORS[0]);
    expect(colorFor(roster, "Nessuno")).toBe("#ffffff");
  });

  it("rebuildLiveRounds riporta i punteggi salvati sullo scheletro dei turni", () => {
    const roster = names(4);
    const [first, ...rest] = buildFreshMatches(roster);
    const saved = [played(first, 11, 4), ...rest];
    const rounds = rebuildLiveRounds(roster, saved);
    const restored = rounds.flatMap((r) => r.matches).find((m) => m.id === first.id);
    expect(restored?.winner).toBe(first.p1);
    expect(rounds.flatMap((r) => r.matches)).toHaveLength(saved.length);
  });
});
