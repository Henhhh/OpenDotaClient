import { HEROES } from "@/features/heroes/data/generated/heroes";
import { HERO_ABILITIES } from "@/features/heroes/data/generated/abilities";
import type { HeroBase, Position } from "@/shared/types/domain";
import { Rng, memo } from "@/shared/utils/rng";

export { HEROES };

const byId = new Map(HEROES.map((h) => [h.id, h]));

export const getHero = (id: number): HeroBase => byId.get(id) ?? HEROES[0];

export const getAbilities = (id: number) =>
  HERO_ABILITIES[id] ?? HERO_ABILITIES[1];

const MID = new Set([
  "invoker",
  "queenofpain",
  "storm_spirit",
  "ember_spirit",
  "void_spirit",
  "puck",
  "lina",
  "zuus",
  "tinker",
  "templar_assassin",
  "nevermore",
  "kunkka",
  "pangolier",
  "death_prophet",
  "leshrac",
  "sniper",
  "obsidian_destroyer",
  "dragon_knight",
  "huskar",
  "batrider",
  "viper",
  "necrolyte",
  "arc_warden",
  "meepo",
  "primal_beast",
  "monkey_king",
  "windrunner",
  "razor",
  "skywrath_mage",
  "lone_druid",
  "morphling",
  "shredder",
  "tiny",
  "kez",
  "broodmother",
  "beastmaster",
  "alchemist",
  "earth_spirit",
  "ringmaster",
  "muerta",
  "outworld_devourer",
  "magnataur",
  "clinkz",
  "lycan",
]);

const OFFLANE = new Set([
  "axe",
  "centaur",
  "tidehunter",
  "mars",
  "legion_commander",
  "bristleback",
  "dark_seer",
  "beastmaster",
  "enigma",
  "sand_king",
  "abyssal_underlord",
  "doom_bringer",
  "night_stalker",
  "brewmaster",
  "slardar",
  "magnataur",
  "primal_beast",
  "shredder",
  "visage",
  "dawnbreaker",
  "razor",
  "viper",
  "necrolyte",
  "pangolier",
  "batrider",
  "venomancer",
  "furion",
  "omniknight",
  "timbersaw",
  "largo",
  "spirit_breaker",
  "kunkka",
  "death_prophet",
  "windrunner",
  "broodmother",
  "lycan",
  "elder_titan",
  "earthshaker",
  "phoenix",
  "tusk",
  "marci",
]);

export function heroPositions(h: HeroBase): Position[] {
  const out: Position[] = [];
  if (h.roles.includes("Carry")) out.push("carry");
  if (MID.has(h.key)) out.push("mid");
  if (OFFLANE.has(h.key)) out.push("offlane");
  if (h.roles.includes("Support")) out.push("support");
  return out.length ? out : ["offlane"];
}

export function primaryPosition(h: HeroBase): Position {
  if (h.roles[0] === "Support") return "support";
  if (MID.has(h.key) && !(h.roles[0] === "Carry" && !h.roles.includes("Nuker")))
    return "mid";
  if (h.roles[0] === "Carry") return "carry";
  if (OFFLANE.has(h.key)) return "offlane";
  if (h.roles.includes("Support")) return "support";
  if (h.roles.includes("Carry")) return "carry";
  return "offlane";
}

export const heroesByPosition = memo((p: Position) =>
  HEROES.filter((h) => primaryPosition(h) === p).map((h) => h.id),
);

/* ---------------- Hero meta stats (mirrors /heroStats + /heroes/{id}/*) ---------------- */

export interface RankBracketStat {
  tier: number;
  picks: number;
  wins: number;
}

export interface HeroStats {
  winRate: number;
  pickRate: number;
  banRate: number;
  proPicks: number;
  proWins: number;
  proBans: number;
  pubGames: number;
  trend: number[];
  byRank: RankBracketStat[];
}

export const heroStats = memo((id: number): HeroStats => {
  const r = new Rng(id * 7919);
  const base = r.float(0.455, 0.555);
  const pop = Math.pow(r.next(), 1.7);
  const pickRate = 0.025 + pop * 0.16;
  const pubGames = Math.round(1_800_000 * pickRate * r.float(0.85, 1.15));
  const byRank: RankBracketStat[] = [1, 2, 3, 4, 5, 6, 7, 8].map((tier) => {
    const slope = r.float(-0.008, 0.008);
    const picks = Math.round(
      pubGames *
        (tier <= 2 ? 0.06 : tier <= 5 ? 0.16 : tier === 8 ? 0.05 : 0.11) *
        r.float(0.7, 1.3),
    );
    const wr = Math.min(
      0.62,
      Math.max(0.38, base + slope * (tier - 4.5) + r.float(-0.012, 0.012)),
    );
    return { tier, picks, wins: Math.round(picks * wr) };
  });
  const proPicks = Math.round(pop * 140 + r.int(0, 20));
  const proBans = Math.round(pop * 180 + r.int(0, 30));
  return {
    winRate: base,
    pickRate,
    banRate: Math.min(0.6, proBans / 620),
    proPicks,
    proWins: Math.round(proPicks * r.float(0.4, 0.6)),
    proBans,
    pubGames,
    trend: Array.from(
      { length: 14 },
      (_, i) =>
        base + Math.sin(i / 2 + r.next() * 3) * 0.01 + r.float(-0.006, 0.006),
    ),
    byRank,
  };
});

export interface Matchup {
  hero_id: number;
  games_played: number;
  wins: number;
}

export const heroMatchups = memo((id: number): Matchup[] => {
  const r = new Rng(id * 104729);
  return HEROES.filter((h) => h.id !== id).map((h) => {
    const games = r.int(180, 2600);
    const wr = Math.min(
      0.66,
      Math.max(0.34, heroStats(id).winRate + r.float(-0.09, 0.09)),
    );
    return { hero_id: h.id, games_played: games, wins: Math.round(games * wr) };
  });
});

export const DURATION_BUCKETS = [
  "< 20m",
  "20–30m",
  "30–40m",
  "40–50m",
  "50m +",
];

export const heroDurations = memo((id: number) => {
  const r = new Rng(id * 31337);
  const h = getHero(id);
  const pos = primaryPosition(h);
  // Carries scale late, gankers/mids peak early – shape the curve accordingly.
  const shape =
    pos === "carry"
      ? [-0.07, -0.02, 0.01, 0.04, 0.06]
      : pos === "support"
        ? [0.02, 0.01, 0, -0.01, -0.02]
        : pos === "mid"
          ? [0.05, 0.03, 0, -0.03, -0.05]
          : [0.01, 0.02, 0.01, -0.01, -0.02];
  const base = heroStats(id).winRate;
  const share = [0.12, 0.36, 0.32, 0.14, 0.06];
  return DURATION_BUCKETS.map((label, i) => {
    const games = Math.round(42_000 * share[i] * r.float(0.8, 1.2));
    const wr = Math.min(
      0.68,
      Math.max(0.32, base + shape[i] + r.float(-0.015, 0.015)),
    );
    return { label, games, wins: Math.round(games * wr) };
  });
});

export const ATTR_FILTERS = ["str", "agi", "int", "all"] as const;

export const ROLE_FILTERS = [
  "Carry",
  "Support",
  "Mid",
  "Offlane",
  "Nuker",
  "Disabler",
  "Initiator",
  "Durable",
  "Escape",
  "Pusher",
] as const;

export function heroMatchesRole(h: HeroBase, role: string) {
  if (role === "Mid") return MID.has(h.key);
  if (role === "Offlane") return OFFLANE.has(h.key);
  return h.roles.includes(role);
}
