import type { Player, Position } from "@/shared/types/domain";
import { PRO_ROSTER, getTeam } from "@/features/pro-scene/data/pro";
import {
  HEROES,
  getHero,
  primaryPosition,
} from "@/features/heroes/data/heroes";
import { Rng, memo } from "@/shared/utils/rng";
import { NOW } from "@/shared/utils/format";

export interface RatingPoint {
  time: number;
  value: number;
}

export const ME_ID = 148217346;

const pub = (
  account_id: number,
  name: string,
  avatarHero: string,
  rank_tier: number | null,
  country: string,
  wins: number,
  losses: number,
  position: Position,
  heroPool: number[],
  mmr?: number,
): Player => ({
  account_id,
  name,
  avatarHero,
  rank_tier,
  country,
  wins,
  losses,
  position,
  heroPool,
  mmr_estimate:
    mmr ??
    (rank_tier
      ? 700 + Math.floor(rank_tier / 10) * 560 + (rank_tier % 10) * 112
      : null),
});

const PUBS: Player[] = [
  {
    ...pub(
      ME_ID,
      "Kaito",
      "storm_spirit",
      63,
      "VN",
      1861,
      1551,
      "mid",
      [17, 39, 13, 106, 25, 46, 126, 23],
      4180,
    ),
    plus: true,
  },
  pub(
    900111222,
    "Shiba",
    "crystal_maiden",
    61,
    "VN",
    1203,
    1098,
    "support",
    [5, 26, 3, 31, 30, 87],
  ),
  pub(
    900222333,
    "LongHair",
    "mars",
    64,
    "VN",
    2011,
    1801,
    "offlane",
    [129, 2, 96, 104, 99, 29],
  ),
  pub(
    900333444,
    "Vanh",
    "antimage",
    55,
    "VN",
    845,
    812,
    "carry",
    [1, 44, 8, 93, 109, 70],
  ),
  pub(
    900444555,
    "Ziczac",
    "rubick",
    66,
    "VN",
    1544,
    1290,
    "support",
    [86, 100, 107, 71, 14, 110],
  ),
  pub(
    900555666,
    "BaoBao",
    "juggernaut",
    52,
    "VN",
    611,
    640,
    "carry",
    [8, 48, 54, 18, 6],
  ),
  pub(
    900666777,
    "M1RA",
    "invoker",
    71,
    "SG",
    2380,
    1977,
    "mid",
    [74, 11, 34, 22, 76],
  ),
  pub(
    900777888,
    "TuanAnh",
    "tidehunter",
    62,
    "VN",
    1320,
    1288,
    "offlane",
    [29, 33, 96, 97, 108],
  ),
  pub(
    900888999,
    "Nhím",
    "witch_doctor",
    45,
    "VN",
    402,
    398,
    "support",
    [30, 27, 26, 5],
  ),
  pub(
    901000111,
    "Huskar.exe",
    "huskar",
    58,
    "PH",
    990,
    921,
    "mid",
    [59, 49, 11, 39],
  ),
  pub(
    901111222,
    "Lặng Gió",
    "windrunner",
    67,
    "VN",
    1712,
    1534,
    "mid",
    [21, 25, 22, 13],
  ),
  pub(
    901222333,
    "Phantom",
    "phantom_assassin",
    48,
    "MY",
    520,
    559,
    "carry",
    [44, 41, 93, 1],
  ),
];

const ROLE_POS: Record<string, Position> = {
  Carry: "carry",
  Mid: "mid",
  Offlane: "offlane",
  "Soft Support": "support",
  "Hard Support": "support",
};

const PROS: Player[] = PRO_ROSTER.map((p) => {
  const r = new Rng(p.account_id);
  const games = r.int(2400, 7800);
  const wr = r.float(0.53, 0.6);
  return {
    account_id: p.account_id,
    name: p.name,
    avatarHero: getHero(p.signature[0]).key,
    rank_tier: 80,
    leaderboard_rank: r.int(1, 240),
    mmr_estimate: null,
    country: p.country,
    wins: Math.round(games * wr),
    losses: games - Math.round(games * wr),
    position: ROLE_POS[p.role],
    heroPool: p.signature,
    pro: { teamId: p.teamId, role: p.role, realName: p.realName },
  };
});

export const PLAYERS: Player[] = [...PUBS, ...PROS];

const byId = new Map(PLAYERS.map((p) => [p.account_id, p]));

export const getPlayer = (id: number) => byId.get(id);

export const ME = byId.get(ME_ID)!;

export const PUB_PLAYERS = PUBS;

export const PRO_PLAYERS = PROS;

export function playerTeam(p: Player) {
  return p.pro ? getTeam(p.pro.teamId) : undefined;
}

/* ---------------- /players/{id}/heroes ---------------- */

export interface PlayerHeroRow {
  hero_id: number;
  games: number;
  win: number;
  last_played: number;
  kda: number;
  gpm: number;
  with_games: number;
  against_games: number;
}

export const playerHeroes = memo((id: number): PlayerHeroRow[] => {
  const p = getPlayer(id)!;
  const r = new Rng(id * 13);
  const total = p.wins + p.losses;
  const baseWr = p.wins / Math.max(1, total);
  const others = r
    .shuffle(HEROES.filter((h) => !p.heroPool.includes(h.id)))
    .sort(
      (a, b) =>
        Number(primaryPosition(b) === p.position) -
        Number(primaryPosition(a) === p.position),
    )
    .slice(0, 22)
    .map((h) => h.id);
  const ids = [...p.heroPool, ...others];
  const weights = ids.map((_, i) =>
    i < p.heroPool.length
      ? 30 / (i + 1)
      : 1.6 / (1 + (i - p.heroPool.length) * 0.25),
  );
  const games = r.distribute(Math.round(total * 0.92), weights, 0.15);
  return ids
    .map((hero_id, i) => {
      const g = games[i];
      const wr = Math.min(
        0.75,
        Math.max(
          0.3,
          baseWr + (i < 4 ? r.float(0, 0.07) : r.float(-0.08, 0.06)),
        ),
      );
      return {
        hero_id,
        games: g,
        win: Math.round(g * wr),
        last_played:
          NOW - (i < 6 ? r.int(1, 72) * 3600 : r.int(3, 240) * 86400),
        kda: r.float(2.1, 5.2),
        gpm: Math.round(
          r.float(
            p.position === "support" ? 260 : 450,
            p.position === "support" ? 380 : 720,
          ),
        ),
        with_games: r.int(20, 200),
        against_games: r.int(20, 220),
      };
    })
    .filter((h) => h.games > 0)
    .sort((a, b) => b.games - a.games);
});

/* ---------------- /players/{id}/peers ---------------- */

export interface PeerRow {
  account_id: number;
  games: number;
  win: number;
  last_played: number;
  with_gpm: number;
}

export const playerPeers = memo((id: number): PeerRow[] => {
  const p = getPlayer(id)!;
  const r = new Rng(id * 17);
  const pool = p.pro
    ? PROS.filter((x) => x.pro!.teamId === p.pro!.teamId && x.account_id !== id)
    : PUBS.filter((x) => x.account_id !== id);
  return pool
    .slice(0, 9)
    .map((x, i) => {
      const games = p.pro
        ? r.int(180, 640)
        : Math.max(8, Math.round(r.int(40, 420) / (1 + i * 0.4)));
      const wr = r.float(0.44, 0.64);
      return {
        account_id: x.account_id,
        games,
        win: Math.round(games * wr),
        last_played: NOW - r.int(2, 200) * 3600,
        with_gpm: r.int(380, 610),
      };
    })
    .sort((a, b) => b.games - a.games);
});

/* ---------------- /players/{id}/totals + /counts ---------------- */

export type RangeKey = "all" | "180" | "30" | "7";

export const RANGE_LABEL: Record<RangeKey, string> = {
  all: "All time",
  "180": "6 months",
  "30": "30 days",
  "7": "7 days",
};

const RANGE_SHARE: Record<RangeKey, number> = {
  all: 1,
  "180": 0.18,
  "30": 0.035,
  "7": 0.009,
};

const AVG: Record<
  Position,
  {
    k: number;
    d: number;
    a: number;
    gpm: number;
    xpm: number;
    lh: number;
    dn: number;
    hd: number;
    td: number;
    hh: number;
    obs: number;
    sen: number;
  }
> = {
  carry: {
    k: 8.9,
    d: 4.6,
    a: 8.1,
    gpm: 612,
    xpm: 668,
    lh: 284,
    dn: 9,
    hd: 24800,
    td: 6200,
    hh: 300,
    obs: 0.4,
    sen: 0.6,
  },
  mid: {
    k: 9.4,
    d: 5.3,
    a: 9.8,
    gpm: 571,
    xpm: 652,
    lh: 228,
    dn: 14,
    hd: 27100,
    td: 3900,
    hh: 520,
    obs: 0.7,
    sen: 0.9,
  },
  offlane: {
    k: 6.6,
    d: 6.1,
    a: 13.2,
    gpm: 468,
    xpm: 561,
    lh: 162,
    dn: 6,
    hd: 19800,
    td: 2600,
    hh: 900,
    obs: 1.2,
    sen: 1.9,
  },
  support: {
    k: 3.8,
    d: 7.6,
    a: 16.4,
    gpm: 318,
    xpm: 402,
    lh: 46,
    dn: 3,
    hd: 12300,
    td: 700,
    hh: 2600,
    obs: 7.6,
    sen: 9.4,
  },
};

export function playerTotals(id: number, range: RangeKey = "all") {
  const p = getPlayer(id)!;
  const r = new Rng(id * 19 + range.length * 7);
  const a = AVG[p.position];
  const games = Math.max(
    3,
    Math.round((p.wins + p.losses) * RANGE_SHARE[range] * r.float(0.9, 1.1)),
  );
  const jitter = () => r.float(0.9, 1.12);
  const wr = Math.min(
    0.72,
    Math.max(
      0.35,
      p.wins / (p.wins + p.losses) +
        (range === "all" ? 0 : r.float(-0.06, 0.07)),
    ),
  );
  return {
    games,
    wins: Math.round(games * wr),
    kills: Math.round(a.k * games * jitter()),
    deaths: Math.round(a.d * games * jitter()),
    assists: Math.round(a.a * games * jitter()),
    last_hits: Math.round(a.lh * games * jitter()),
    denies: Math.round(a.dn * games * jitter()),
    hero_damage: Math.round(a.hd * games * jitter()),
    tower_damage: Math.round(a.td * games * jitter()),
    hero_healing: Math.round(a.hh * games * jitter()),
    gpm: Math.round(a.gpm * jitter()),
    xpm: Math.round(a.xpm * jitter()),
    obs: Math.round(a.obs * games * jitter()),
    sen: Math.round(a.sen * games * jitter()),
    duration: Math.round(games * r.float(34, 41) * 60),
  };
}

export function playerCounts(id: number, range: RangeKey = "all") {
  const p = getPlayer(id)!;
  const r = new Rng(id * 23 + range.length);
  const total = playerTotals(id, range).games;
  const modes = r.distribute(total, [
    p.pro ? 40 : 78,
    12,
    4,
    3,
    2,
    p.pro ? 39 : 1,
  ]);
  const laneW = {
    carry: [72, 6, 10, 12],
    mid: [8, 82, 6, 4],
    offlane: [6, 4, 84, 6],
    support: [46, 4, 44, 6],
  }[p.position];
  const lanes = r.distribute(total, laneW);
  const posW = {
    carry: [74, 10, 8, 5, 3],
    mid: [9, 76, 7, 5, 3],
    offlane: [5, 6, 74, 10, 5],
    support: [2, 3, 6, 48, 41],
  }[p.position];
  const positions = r.distribute(total, posW);
  const wr = p.wins / (p.wins + p.losses);
  const w = (g: number) =>
    Math.round(g * Math.min(0.75, Math.max(0.3, wr + r.float(-0.06, 0.06))));
  return {
    game_mode: [
      { label: "All Pick", games: modes[0] },
      { label: "Turbo", games: modes[1] },
      { label: "Single Draft", games: modes[2] },
      { label: "Random Draft", games: modes[3] },
      { label: "Ability Draft", games: modes[4] },
      { label: "Captains Mode", games: modes[5] },
    ].map((m) => ({ ...m, win: w(m.games) })),
    lane_role: [
      { label: "Safe lane", games: lanes[0], color: "#9cc95a" },
      { label: "Mid lane", games: lanes[1], color: "var(--od-gold)" },
      { label: "Off lane", games: lanes[2], color: "var(--od-primary)" },
      { label: "Jungle", games: lanes[3], color: "#6b7cff" },
    ].map((m) => ({ ...m, win: w(m.games) })),
    position: [
      "Pos 1 · Carry",
      "Pos 2 · Mid",
      "Pos 3 · Offlane",
      "Pos 4 · Soft Sup",
      "Pos 5 · Hard Sup",
    ].map((label, i) => ({ label, games: positions[i], win: w(positions[i]) })),
    lobby: [
      { label: "Ranked", games: Math.round(total * (p.pro ? 0.6 : 0.82)) },
      { label: "Unranked", games: Math.round(total * (p.pro ? 0.4 : 0.18)) },
    ],
  };
}

/** /players/{id}/ratings is sparse – pros and private profiles often have no history. */
export const ratingHistory = memo((id: number): RatingPoint[] | null => {
  const p = getPlayer(id)!;
  if (p.pro || !p.mmr_estimate) return null;
  const r = new Rng(id * 29);
  let v = p.mmr_estimate - r.int(250, 520);
  const pts: RatingPoint[] = [];
  for (let i = 52; i >= 0; i--) {
    v += r.float(-55, 70);
    pts.push({ time: NOW - i * 7 * 86400, value: Math.round(v) });
  }
  pts[pts.length - 1].value = p.mmr_estimate;
  return pts;
});

const WARD_SPOTS = [
  [38, 44],
  [46, 36],
  [56, 62],
  [62, 54],
  [30, 58],
  [70, 40],
  [50, 50],
  [24, 34],
  [76, 66],
  [42, 70],
  [58, 28],
  [34, 26],
  [66, 76],
  [20, 72],
  [80, 26],
];

export const wardMap = memo((id: number) => {
  const r = new Rng(id * 31);
  const p = getPlayer(id)!;
  const n = p.position === "support" ? 1 : 0.35;
  const gen = (count: number, spread: number) =>
    Array.from({ length: Math.round(count * n) }, () => {
      const [x, y] = r.pick(WARD_SPOTS);
      return {
        x: x + r.float(-spread, spread),
        y: y + r.float(-spread, spread),
      };
    });
  return { obs: gen(46, 4), sen: gen(62, 5.5) };
});

export function playerRadar(id: number) {
  const p = getPlayer(id)!;
  const r = new Rng(id * 37);
  const base = {
    carry: [72, 90, 30, 70, 55, 62],
    mid: [84, 74, 40, 62, 72, 58],
    offlane: [80, 52, 58, 64, 60, 70],
    support: [56, 26, 92, 36, 66, 48],
  }[p.position];
  return [
    "Fighting",
    "Farming",
    "Supporting",
    "Pushing",
    "Versatility",
    "Survival",
  ].map((label, i) => ({
    label,
    value: Math.min(98, Math.max(12, base[i] + r.int(-12, 12))),
  }));
}
