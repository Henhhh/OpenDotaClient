import { ITEMS } from "./generated/items";
import { getHero, primaryPosition } from "@/features/heroes/data/heroes";
import type { HeroBase } from "@/shared/types/domain";
import { Rng, memo } from "@/shared/utils/rng";
export { ITEMS };
export const getItem = (key: string) => ITEMS[key];
/* ---------------- Item builds ---------------- */

type Archetype =
  "carry_agi" | "carry_str" | "mid_int" | "mid_agi" | "offlane" | "support";

const BUILDS: Record<
  Archetype,
  {
    start: string[];
    early: string[];
    mid: string[];
    late: string[];
    situational: string[];
  }
> = {
  carry_agi: {
    start: [
      "tango",
      "quelling_blade",
      "slippers",
      "branches",
      "flask",
      "circlet",
    ],
    early: [
      "magic_wand",
      "power_treads",
      "wraith_band",
      "falcon_blade",
      "maelstrom",
    ],
    mid: ["manta", "black_king_bar", "bfury", "skadi", "harpoon"],
    late: [
      "butterfly",
      "satanic",
      "greater_crit",
      "abyssal_blade",
      "moon_shard",
    ],
    situational: [
      "monkey_king_bar",
      "sphere",
      "nullifier",
      "silver_edge",
      "swift_blink",
    ],
  },
  carry_str: {
    start: [
      "tango",
      "quelling_blade",
      "gauntlets",
      "branches",
      "flask",
      "enchanted_mango",
    ],
    early: ["phase_boots", "bracer", "magic_wand", "armlet", "echo_sabre"],
    mid: ["black_king_bar", "blink", "sange_and_yasha", "desolator", "basher"],
    late: [
      "assault",
      "satanic",
      "abyssal_blade",
      "heart",
      "overwhelming_blink",
    ],
    situational: [
      "silver_edge",
      "monkey_king_bar",
      "aeon_disk",
      "heavens_halberd",
      "nullifier",
    ],
  },
  mid_int: {
    start: [
      "tango",
      "faerie_fire",
      "branches",
      "circlet",
      "mantle",
      "enchanted_mango",
    ],
    early: [
      "bottle",
      "null_talisman",
      "magic_wand",
      "power_treads",
      "soul_ring",
    ],
    mid: [
      "kaya_and_sange",
      "black_king_bar",
      "blink",
      "ultimate_scepter",
      "orchid",
    ],
    late: [
      "octarine_core",
      "sheepstick",
      "refresher",
      "shivas_guard",
      "bloodstone",
    ],
    situational: [
      "sphere",
      "aeon_disk",
      "ethereal_blade",
      "wind_waker",
      "arcane_blink",
    ],
  },
  mid_agi: {
    start: ["tango", "faerie_fire", "branches", "slippers", "circlet"],
    early: [
      "bottle",
      "wraith_band",
      "power_treads",
      "magic_wand",
      "dragon_lance",
    ],
    mid: [
      "black_king_bar",
      "desolator",
      "blink",
      "hurricane_pike",
      "yasha_and_kaya",
    ],
    late: ["satanic", "butterfly", "greater_crit", "skadi", "moon_shard"],
    situational: [
      "monkey_king_bar",
      "sphere",
      "silver_edge",
      "nullifier",
      "travel_boots",
    ],
  },
  offlane: {
    start: [
      "tango",
      "quelling_blade",
      "gauntlets",
      "branches",
      "flask",
      "ring_of_protection",
    ],
    early: ["vanguard", "phase_boots", "magic_wand", "bracer", "soul_ring"],
    mid: ["blink", "black_king_bar", "pipe", "crimson_guard", "blade_mail"],
    late: [
      "shivas_guard",
      "assault",
      "heart",
      "lotus_orb",
      "overwhelming_blink",
    ],
    situational: [
      "heavens_halberd",
      "aeon_disk",
      "sphere",
      "refresher",
      "ultimate_scepter",
    ],
  },
  support: {
    start: [
      "tango",
      "ward_observer",
      "ward_sentry",
      "branches",
      "blood_grenade",
      "clarity",
    ],
    early: [
      "magic_wand",
      "arcane_boots",
      "tranquil_boots",
      "urn_of_shadows",
      "wind_lace",
    ],
    mid: [
      "glimmer_cape",
      "force_staff",
      "ghost",
      "aether_lens",
      "spirit_vessel",
    ],
    late: [
      "lotus_orb",
      "aeon_disk",
      "boots_of_bearing",
      "guardian_greaves",
      "sheepstick",
    ],
    situational: [
      "cyclone",
      "solar_crest",
      "pavise",
      "aghanims_shard",
      "holy_locket",
    ],
  },
};

const has = (k: string) => Boolean(ITEMS[k]);

export function heroArchetype(h: HeroBase): Archetype {
  const p = primaryPosition(h);
  if (p === "support") return "support";
  if (p === "offlane") return "offlane";
  if (p === "mid")
    return h.attr === "agi"
      ? "mid_agi"
      : h.attr === "str"
        ? "carry_str"
        : "mid_int";
  return h.attr === "str"
    ? "carry_str"
    : h.attr === "int"
      ? "mid_int"
      : "carry_agi";
}

export function buildFor(h: HeroBase) {
  const b = BUILDS[heroArchetype(h)];
  const f = (a: string[]) => a.filter(has);
  return {
    start: f(b.start),
    early: f(b.early),
    mid: f(b.mid),
    late: f(b.late),
    situational: f(b.situational),
  };
}

export interface ItemPop {
  key: string;
  pct: number;
  games: number;
}

/** Mirrors GET /heroes/{id}/itemPopularity – aggregated across public matches, not a single game. */
export const itemPopularity = memo((id: number) => {
  const r = new Rng(id * 2027);
  const b = buildFor(getHero(id));
  const sample = r.int(9_000, 24_000);
  const mk = (keys: string[], top: number): ItemPop[] =>
    r
      .shuffle(keys)
      .map((key, i) => {
        const pct = Math.max(0.04, top - i * r.float(0.07, 0.16));
        return { key, pct, games: Math.round(sample * pct) };
      })
      .sort((a, b2) => b2.pct - a.pct);
  return {
    sample,
    start: mk(b.start, 0.94),
    early: mk(b.early, 0.82),
    mid: mk(b.mid, 0.71),
    late: mk(b.late, 0.44),
    situational: mk(b.situational, 0.28),
  };
});

export type HeroItemPopularity = ReturnType<typeof itemPopularity>;

/* ---------------- Skill builds ---------------- */

/** Level → ability index (0–2 basic, 3 ultimate, 4 talent) or null when no skill point. */
export function genSkillOrder(seed: number) {
  const r = new Rng(seed);
  const [P, S, T] = r.shuffle([0, 1, 2]);
  const basicLevels = [1, 2, 3, 4, 5, 7, 8, 9, 11, 13, 14, 16];
  const basicSeq = [P, S, P, T, P, P, S, S, S, T, T, T];
  const order: (number | null)[] = Array(30).fill(null);
  basicLevels.forEach((lvl, i) => (order[lvl - 1] = basicSeq[i]));
  [6, 12, 18].forEach((l) => (order[l - 1] = 3));
  [10, 15, 20, 25, 27, 28, 29, 30].forEach((l) => (order[l - 1] = 4));
  const talentPicks = [0, 1, 2, 3].map(() => (r.chance(0.5) ? "L" : "R")) as (
    "L" | "R"
  )[];
  return { order, talentPicks };
}

export const popularSkillBuild = memo((id: number) => ({
  ...genSkillOrder(id * 97),
  sample: new Rng(id).int(4000, 16000),
}));
