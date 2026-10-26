import type {
  MatchDetail,
  MatchEvent,
  MatchPlayer,
  PickBan,
  PlayerMatch,
  Position,
  Teamfight,
  ItemPurchase,
} from "@/shared/types/domain";
import {
  HEROES,
  getHero,
  heroesByPosition,
  primaryPosition,
} from "@/features/heroes/data/heroes";
import {
  buildFor,
  genSkillOrder,
  getItem,
} from "@/features/builds/data/builds";
import {
  ME_ID,
  PLAYERS,
  PUB_PLAYERS,
  getPlayer,
} from "@/features/players/data/players";
import {
  getLeague,
  getTeam,
  proByTeam,
  proMatchIndex,
  PRO_ROSTER,
} from "@/features/pro-scene/data/pro";
import { Rng, memo } from "@/shared/utils/rng";
import { NOW } from "@/shared/utils/format";

type Hint = PlayerMatch & { name?: string };

const HINTS = new Map<number, Hint>();

const PROFILE: Record<
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
  },
};

const LANE: Record<Position, 1 | 2 | 3 | 4> = {
  carry: 1,
  mid: 2,
  offlane: 3,
  support: 1,
};

/** Slot index (0–4) within a team, ordered by position 1–5. */
const SLOT: Record<Position, number> = {
  carry: 0,
  mid: 1,
  offlane: 2,
  support: 3,
};

const slotFor = (pos: Position, isRadiant: boolean, alt = false) =>
  (isRadiant ? 0 : 128) + SLOT[pos] + (pos === "support" && alt ? 1 : 0);

function heroForPosition(r: Rng, pos: Position, used: Set<number>) {
  const pool = heroesByPosition(pos).filter((id) => !used.has(id));
  const id = pool.length
    ? r.pick(pool)
    : r.pick(HEROES.filter((h) => !used.has(h.id))).id;
  used.add(id);
  return id;
}

/* ---------------- /players/{id}/matches ---------------- */

export const playerMatches = memo((accountId: number): PlayerMatch[] => {
  const p = getPlayer(accountId)!;
  const r = new Rng(accountId * 41);
  const count = accountId === ME_ID ? 48 : 30;
  const prof = PROFILE[p.position];
  const wr = p.wins / (p.wins + p.losses);
  let id =
    accountId === ME_ID
      ? 8_312_547_001
      : 8_312_540_000 - (accountId % 9973) * 211;
  let t = NOW - r.int(50, 140) * 60;
  const weights = p.heroPool.map((_, i) => 30 / (i + 1));
  const out: PlayerMatch[] = [];
  for (let i = 0; i < count; i++) {
    const turbo = !p.pro && r.chance(0.09);
    const unranked = !turbo && r.chance(0.1);
    const game_mode = turbo ? 23 : r.chance(0.05) ? 4 : 22;
    const hero_id =
      i === 0
        ? p.heroPool[0]
        : r.chance(0.85)
          ? r.weighted(p.heroPool, weights)
          : r.pick(heroesByPosition(p.position));
    const won =
      i === 0 ? true : r.chance(Math.min(0.75, wr + (i < 8 ? 0.06 : 0)));
    const isRadiant = r.chance(0.5);
    const duration = turbo ? r.int(14 * 60, 27 * 60) : r.int(21 * 60, 56 * 60);
    const f = duration / 60 / 38;
    const kills =
      Math.round(prof.k * f * (won ? 1.25 : 0.8) * r.float(0.45, 1.6)) +
      (i === 0 ? 6 : 0);
    const deaths = Math.max(
      0,
      Math.round(prof.d * f * (won ? 0.72 : 1.25) * r.float(0.35, 1.5)) -
        (i === 0 ? 2 : 0),
    );
    const assists = Math.round(
      prof.a * f * (won ? 1.2 : 0.85) * r.float(0.5, 1.5),
    );
    const gpm =
      Math.round(
        prof.gpm *
          (won ? 1.08 : 0.92) *
          r.float(0.86, 1.18) *
          (turbo ? 1.55 : 1),
      ) + (i === 0 ? 90 : 0);
    const xpm =
      Math.round(
        prof.xpm *
          (won ? 1.07 : 0.93) *
          r.float(0.86, 1.16) *
          (turbo ? 1.6 : 1),
      ) + (i === 0 ? 80 : 0);
    out.push({
      match_id: id,
      account_id: accountId,
      player_slot: slotFor(p.position, isRadiant, r.chance(0.5)),
      radiant_win: isRadiant === won,
      hero_id,
      kills,
      deaths,
      assists,
      duration,
      game_mode,
      lobby_type: turbo || unranked ? 0 : 7,
      start_time: t,
      gold_per_min: gpm,
      xp_per_min: xpm,
      last_hits: Math.round(
        prof.lh * f * r.float(0.75, 1.25) * (turbo ? 1.4 : 1),
      ),
      hero_damage: Math.round(
        prof.hd * f * r.float(0.6, 1.45) * (i === 0 ? 1.5 : 1),
      ),
      tower_damage: Math.round(prof.td * f * r.float(0.3, 1.6)),
      hero_healing: Math.round(prof.hh * f * r.float(0.2, 1.6)),
      level: Math.min(
        30,
        Math.round(
          9 + (duration / 60) * 0.44 * (won ? 1.05 : 0.95) * (turbo ? 1.5 : 1),
        ),
      ),
      net_worth: Math.round(gpm * (duration / 60) * 0.93),
      lane_role: LANE[p.position],
      party_size: r.weighted([1, 2, 3, 5], [46, 32, 14, 8]),
      parsed: i === 0 || i === 2 || r.chance(0.42),
    });
    HINTS.set(id, { ...out[i], name: p.name });
    id -= r.int(38_000, 420_000);
    t -=
      duration + r.int(8, 60) * 60 + (r.chance(0.35) ? r.int(6, 40) * 3600 : 0);
  }
  return out;
});

// Seed the featured player's history so match IDs resolve from any entry point.
playerMatches(ME_ID);

/* ---------------- /heroes/{id}/matches + /heroes/{id}/players ---------------- */

export interface HeroMatchRow extends PlayerMatch {
  name: string;
  rank_tier: number | null;
  isPro: boolean;
}

export const heroRecentMatches = memo((heroId: number): HeroMatchRow[] => {
  const r = new Rng(heroId * 4231);
  const h = getHero(heroId);
  const pos = primaryPosition(h);
  const prof = PROFILE[pos];
  let id = 8_312_499_000 - heroId * 7919;
  let t = NOW - r.int(20, 90) * 60;
  const rows: HeroMatchRow[] = [];
  for (let i = 0; i < 12; i++) {
    const pro = r.chance(0.35) ? r.pick(PRO_ROSTER) : null;
    const pubP = !pro && r.chance(0.5) ? r.pick(PUB_PLAYERS) : null;
    const name = pro?.name ?? pubP?.name ?? "Anonymous";
    const won = r.chance(0.52);
    const isRadiant = r.chance(0.5);
    const duration = r.int(22 * 60, 54 * 60);
    const f = duration / 60 / 38;
    const row: HeroMatchRow = {
      match_id: id,
      account_id: pro?.account_id ?? pubP?.account_id ?? 0,
      player_slot: slotFor(pos, isRadiant, pos === "support"),
      radiant_win: isRadiant === won,
      hero_id: heroId,
      kills: Math.round(prof.k * f * (won ? 1.2 : 0.8) * r.float(0.5, 1.6)),
      deaths: Math.round(prof.d * f * (won ? 0.75 : 1.2) * r.float(0.4, 1.5)),
      assists: Math.round(prof.a * f * r.float(0.5, 1.5)),
      duration,
      game_mode: 22,
      lobby_type: 7,
      start_time: t,
      gold_per_min: Math.round(prof.gpm * r.float(0.85, 1.2)),
      xp_per_min: Math.round(prof.xpm * r.float(0.85, 1.2)),
      last_hits: Math.round(prof.lh * f * r.float(0.8, 1.2)),
      hero_damage: Math.round(prof.hd * f * r.float(0.6, 1.4)),
      tower_damage: Math.round(prof.td * f * r.float(0.3, 1.5)),
      hero_healing: Math.round(prof.hh * f * r.float(0.2, 1.5)),
      level: Math.min(30, Math.round(9 + (duration / 60) * 0.44)),
      net_worth: 0,
      lane_role: LANE[pos],
      party_size: 1,
      parsed: r.chance(0.6),
      name,
      rank_tier: pro ? 80 : (pubP?.rank_tier ?? r.int(55, 80)),
      isPro: Boolean(pro),
    };
    row.net_worth = Math.round(row.gold_per_min * (duration / 60) * 0.93);
    rows.push(row);
    HINTS.set(id, row);
    id -= r.int(9_000, 160_000);
    t -= r.int(20, 240) * 60;
  }
  return rows;
});

export const heroTopPlayers = memo((heroId: number) => {
  const r = new Rng(heroId * 619);
  const signature = PRO_ROSTER.filter((p) => p.signature.includes(heroId)).map(
    (p) => p.account_id,
  );
  const others = r
    .shuffle(
      PLAYERS.map((p) => p.account_id).filter((id) => !signature.includes(id)),
    )
    .slice(0, 12 - signature.length);
  return [...signature, ...others]
    .map((account_id, i) => {
      const games = i < signature.length ? r.int(160, 520) : r.int(40, 260);
      const wr = r.float(0.5, 0.7);
      return {
        account_id,
        games,
        wins: Math.round(games * wr),
        score: games * wr * wr,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
});

/* ---------------- /matches/{id} ---------------- */

const POSITIONS: Position[] = ["carry", "mid", "offlane", "support", "support"];

const KILL_W = [1.4, 1.5, 1.0, 0.6, 0.4];

const DEATH_W = [0.8, 1.0, 1.1, 1.3, 1.4];

const REGIONS = [
  "SE Asia",
  "Europe West",
  "Europe East",
  "US East",
  "China",
  "Australia",
];

function distributeFixed(
  r: Rng,
  total: number,
  weights: number[],
  fixedIdx: number,
  fixedVal: number,
) {
  if (fixedIdx < 0) return r.distribute(total, weights);
  const rest = Math.max(0, total - fixedVal);
  const w = weights.filter((_, i) => i !== fixedIdx);
  const parts = r.distribute(rest, w);
  parts.splice(fixedIdx, 0, fixedVal);
  return parts;
}

function genPurchases(
  r: Rng,
  heroId: number,
  duration: number,
  pos: Position,
  won: boolean,
) {
  const b = buildFor(getHero(heroId));
  const min = duration / 60;
  const purchases: ItemPurchase[] = [];
  r.shuffle(b.start)
    .slice(0, pos === "support" ? 5 : 4)
    .forEach((key, i) => purchases.push({ key, time: -88 + i * 3 }));
  if (pos === "support")
    purchases.push(
      { key: "ward_observer", time: 140 },
      {
        key: "ward_sentry",
        time: 380,
      },
    );
  const tempo = (won ? 0.9 : 1.1) * (pos === "support" ? 1.4 : 1);
  let t = r.int(150, 260) * tempo;
  const queue = [
    ...b.early.slice(0, 3),
    ...r.shuffle(b.mid).slice(0, 3),
    ...r.shuffle(b.late).slice(0, 3),
  ];
  for (const key of queue) {
    const cost = getItem(key)?.cost ?? 1000;
    t +=
      (cost / (pos === "support" ? 6.2 : pos === "offlane" ? 8.5 : 10.5)) *
      tempo *
      r.float(0.8, 1.25);
    if (t > duration - 30) break;
    purchases.push({ key, time: Math.round(t) });
  }
  if (min > 30 && pos !== "support" && r.chance(0.5))
    purchases.push({
      key: "aghanims_shard",
      time: Math.round(Math.min(duration - 60, 20 * 60 + r.int(0, 600))),
    });
  purchases.sort((a, c) => a.time - c.time);
  const majors = purchases.filter(
    (p) =>
      (getItem(p.key)?.cost ?? 0) >= 500 &&
      p.key !== "aghanims_shard" &&
      !p.key.startsWith("ward"),
  );
  const items: (string | null)[] = majors.slice(-6).map((p) => p.key);
  const smalls = purchases
    .filter((p) =>
      [
        "magic_wand",
        "branches",
        "bracer",
        "wraith_band",
        "null_talisman",
        "bottle",
      ].includes(p.key),
    )
    .map((p) => p.key);
  while (items.length < 6) items.push(smalls.shift() ?? null);
  const backpack: (string | null)[] = [
    r.chance(0.5) ? "tpscroll" : null,
    r.chance(0.3) ? (pos === "support" ? "dust" : "faerie_fire") : null,
    null,
  ];
  return { purchases, items, backpack };
}

export const getMatch = memo((id: number): MatchDetail => {
  const r = new Rng(id % 2_147_483_647);
  const pro = proMatchIndex.get(id);
  const hint = pro ? undefined : HINTS.get(id);
  const radiant_win = pro
    ? pro.radiant_win
    : hint
      ? hint.radiant_win
      : r.chance(0.5);
  const duration = pro?.duration ?? hint?.duration ?? r.int(24 * 60, 52 * 60);
  const game_mode = pro ? 2 : (hint?.game_mode ?? 22);
  const lobby_type = pro ? 1 : (hint?.lobby_type ?? 7);
  const start_time =
    pro?.start_time ?? hint?.start_time ?? NOW - r.int(2, 600) * 3600;
  const parsed = pro ? true : hint ? hint.parsed : r.chance(0.5);
  const min = duration / 60;

  const hintPlayer = hint ? getPlayer(hint.account_id) : undefined;
  const hintRadiant = hint ? hint.player_slot < 128 : false;
  // History rows already encode the player's position in their slot (0–4 / 128–132).
  const hintIdx = hint ? hint.player_slot % 128 : -1;

  // Heroes per side, ordered by position 1–5.
  const used = new Set<number>(hint ? [hint.hero_id] : []);
  const sideHeroes = [true, false].map((isRad) =>
    POSITIONS.map((pos, i) =>
      hint && isRad === hintRadiant && i === hintIdx
        ? hint.hero_id
        : heroForPosition(r, pos, used),
    ),
  );

  // Team kill totals must reconcile with each side's deaths.
  let winK = Math.round(
    min * r.float(0.72, 1.05) * (game_mode === 23 ? 1.6 : 1),
  );
  let loseK = Math.round(winK * r.float(0.4, 0.82));
  if (pro) {
    winK = radiant_win ? pro.radiant_score : pro.dire_score;
    loseK = radiant_win ? pro.dire_score : pro.radiant_score;
  }
  let radK = radiant_win ? winK : loseK;
  let dirK = radiant_win ? loseK : winK;
  if (hint) {
    if (hintRadiant) {
      radK = Math.max(radK, hint.kills + 4);
      dirK = Math.max(dirK, hint.deaths + 3);
    } else {
      dirK = Math.max(dirK, hint.kills + 4);
      radK = Math.max(radK, hint.deaths + 3);
    }
  }

  const names = (
    isRad: boolean,
  ): {
    name: string;
    account_id: number | null;
    rank: number | null;
  }[] => {
    if (pro) {
      const roster = proByTeam(isRad ? pro.radiant_team_id : pro.dire_team_id);
      return roster.map((p) => ({
        name: p.name,
        account_id: p.account_id,
        rank: 80,
      }));
    }
    const pool = r.shuffle(
      PUB_PLAYERS.filter((p) => p.account_id !== hint?.account_id),
    );
    const base = hintPlayer?.rank_tier ?? 62;
    return POSITIONS.map((_, i) => {
      const known = r.chance(0.3) ? pool[i] : undefined;
      return known
        ? {
            name: known.name,
            account_id: known.account_id,
            rank: known.rank_tier,
          }
        : {
            name: r.chance(0.35)
              ? "Anonymous"
              : r.pick([
                  "Sleepy",
                  "GG EZ",
                  "Dendi fan",
                  "pos5 btw",
                  "1k gpm",
                  "ward bot",
                  "Mid or feed",
                  "Meepo god",
                  "tilted",
                  "Đạt",
                  "Hùng",
                  "Minh",
                  "kid",
                  "Bóng Đêm",
                  "Spectre spam",
                  "XxSniperxX",
                ]),
            account_id: null,
            rank: Math.max(11, Math.min(80, base + r.int(-6, 6))),
          };
    });
  };

  const players: MatchPlayer[] = [];
  [true, false].forEach((isRad, side) => {
    const teamK = isRad ? radK : dirK;
    const enemyK = isRad ? dirK : radK;
    const won = isRad === radiant_win;
    const fixedIdx = hint && isRad === hintRadiant ? hintIdx : -1;
    const kills = distributeFixed(r, teamK, KILL_W, fixedIdx, hint?.kills ?? 0);
    const deaths = distributeFixed(
      r,
      enemyK,
      DEATH_W,
      fixedIdx,
      hint?.deaths ?? 0,
    );
    const ns = names(isRad);
    POSITIONS.forEach((pos, i) => {
      const isHint = i === fixedIdx && hint;
      const prof = PROFILE[pos];
      const heroId = sideHeroes[side][i];
      const f = min / 38;
      const gpm = isHint
        ? hint.gold_per_min
        : Math.round(
            prof.gpm *
              (won ? 1.08 : 0.9) *
              r.float(0.85, 1.15) *
              (game_mode === 23 ? 1.55 : 1),
          );
      const xpm = isHint
        ? hint.xp_per_min
        : Math.round(
            prof.xpm *
              (won ? 1.07 : 0.92) *
              r.float(0.85, 1.15) *
              (game_mode === 23 ? 1.6 : 1),
          );
      const level = isHint
        ? hint.level
        : Math.min(30, Math.round(8 + min * 0.42 * (xpm / prof.xpm)));
      const { purchases, items, backpack } = genPurchases(
        r,
        heroId,
        duration,
        pos,
        won,
      );
      const skill = genSkillOrder(id + i * 31 + side * 7);
      players.push({
        player_slot: (isRad ? 0 : 128) + i,
        isRadiant: isRad,
        account_id: isHint ? hint.account_id : ns[i].account_id,
        name: isHint ? (hint.name ?? hintPlayer?.name ?? "Player") : ns[i].name,
        hero_id: heroId,
        rank_tier: isHint ? (hintPlayer?.rank_tier ?? null) : ns[i].rank,
        level,
        kills: kills[i],
        deaths: deaths[i],
        assists: isHint
          ? hint.assists
          : Math.max(
              0,
              Math.round(teamK * r.float(0.38, 0.72) - kills[i] * 0.4),
            ),
        last_hits: isHint
          ? hint.last_hits
          : Math.round(prof.lh * f * r.float(0.75, 1.25)),
        denies: Math.round(prof.dn * f * r.float(0.4, 1.6)),
        gold_per_min: gpm,
        xp_per_min: xpm,
        hero_damage: isHint
          ? hint.hero_damage
          : Math.round(prof.hd * f * r.float(0.6, 1.45)),
        tower_damage: isHint
          ? hint.tower_damage
          : Math.round(prof.td * f * r.float(0.3, 1.6) * (won ? 1.3 : 0.7)),
        hero_healing: isHint
          ? hint.hero_healing
          : Math.round(prof.hh * f * r.float(0.2, 1.6)),
        net_worth: isHint
          ? hint.net_worth
          : Math.round(gpm * min * r.float(0.88, 0.97)),
        items,
        backpack,
        neutral: null,
        purchases,
        skillOrder: skill.order.map((v, lvl) => (lvl < level ? v : null)),
        talentPicks: skill.talentPicks,
        obs_placed:
          pos === "support"
            ? Math.round(min * r.float(0.25, 0.5))
            : r.int(0, 2),
        sen_placed:
          pos === "support" ? Math.round(min * r.float(0.3, 0.6)) : r.int(0, 3),
        position: pos,
      });
    });
  });

  // Draft
  const radHeroes = sideHeroes[0];
  const dirHeroes = sideHeroes[1];
  const banPool = r.shuffle(
    HEROES.map((h) => h.id).filter((h) => !used.has(h)),
  );
  const picks_bans: PickBan[] = [];
  if (game_mode === 2) {
    const firstTeam: 0 | 1 = r.chance(0.5) ? 0 : 1;
    const A = firstTeam;
    const B = (1 - firstTeam) as 0 | 1;
    const seq: [boolean, 0 | 1][] = [
      [false, A],
      [false, B],
      [false, A],
      [false, B],
      [false, A],
      [false, B],
      [false, B],
      [true, A],
      [true, B],
      [false, A],
      [false, A],
      [false, B],
      [true, B],
      [true, A],
      [true, A],
      [true, B],
      [true, B],
      [true, A],
      [false, A],
      [false, B],
      [false, A],
      [false, B],
      [true, A],
      [true, B],
    ];
    const queues = { 0: r.shuffle(radHeroes), 1: r.shuffle(dirHeroes) };
    seq.forEach(([is_pick, team], order) =>
      picks_bans.push({
        order,
        is_pick,
        team,
        hero_id: is_pick ? queues[team].shift()! : banPool.pop()!,
      }),
    );
  } else {
    const bans = game_mode === 22 ? r.int(6, 10) : 0;
    for (let i = 0; i < bans; i++)
      picks_bans.push({
        order: i,
        is_pick: false,
        team: (i % 2) as 0 | 1,
        hero_id: banPool.pop()!,
      });
    const pattern: (0 | 1)[] = r.chance(0.5)
      ? [0, 1, 1, 0, 0, 1, 1, 0, 0, 1]
      : [1, 0, 0, 1, 1, 0, 0, 1, 1, 0];
    const queues = { 0: r.shuffle(radHeroes), 1: r.shuffle(dirHeroes) };
    pattern.forEach((team, i) =>
      picks_bans.push({
        order: bans + i,
        is_pick: true,
        team,
        hero_id: queues[team].shift()!,
      }),
    );
  }

  // Gold / XP advantage per minute (parsed data)
  const n = Math.floor(min) + 1;
  const sign = radiant_win ? 1 : -1;
  const target = sign * r.int(pro ? 6000 : 9000, pro ? 22000 : 32000);
  const walk = [0];
  for (let i = 1; i < n; i++)
    walk.push(walk[i - 1] + r.float(-1, 1) * (180 + i * 70));
  const gold = walk.map((v, i) =>
    Math.round(
      v + (target - walk[n - 1]) * Math.pow(i / Math.max(1, n - 1), 1.5),
    ),
  );
  gold[0] = 0;
  const xp = gold.map((g, i) =>
    i === 0 ? 0 : Math.round(g * r.float(1.05, 1.35) + r.float(-600, 600)),
  );

  const allIds = players.map((p) => p.hero_id);
  const teamfights: Teamfight[] = [];
  const fights = Math.max(3, Math.round(min / 5.5));
  for (let i = 0; i < fights; i++) {
    const start = Math.round(r.float(7 * 60, duration - 90));
    const m = Math.min(n - 3, Math.floor(start / 60));
    const swing = (gold[m + 2] ?? gold[n - 1]) - gold[Math.max(0, m)];
    const favored = swing >= 0;
    teamfights.push({
      start,
      end: start + r.int(14, 48),
      radiantDeaths: favored ? r.int(0, 2) : r.int(2, 5),
      direDeaths: favored ? r.int(2, 5) : r.int(0, 2),
      goldSwing: Math.round(swing),
      heroes: r.shuffle(allIds).slice(0, r.int(6, 10)),
    });
  }
  teamfights.sort((a, b) => a.start - b.start);

  const objectives: MatchEvent[] = [];
  const fbTeam: 0 | 1 = r.chance(0.55) === radiant_win ? 0 : 1;
  objectives.push({
    time: r.int(40, 230),
    type: "first_blood",
    team: fbTeam,
    label: "First Blood",
    heroId: (fbTeam === 0 ? radHeroes : dirHeroes)[r.int(0, 2)],
  });
  const towerNames = [
    "Bot T1",
    "Top T1",
    "Mid T1",
    "Bot T2",
    "Mid T2",
    "Top T2",
    "Mid T3",
    "Bot T3",
  ];
  towerNames.forEach((tn, i) => {
    const time = Math.round(
      Math.min(
        duration - 60,
        (8 + i * 3.6) * 60 * r.float(0.8, 1.2) * (min / 40 + 0.4),
      ),
    );
    const team: 0 | 1 = r.chance(0.65) === radiant_win ? 0 : 1;
    if (i < 6 || team === (radiant_win ? 0 : 1))
      objectives.push({
        time,
        type: "tower",
        team,
        label: `${team === 0 ? "Radiant" : "Dire"} destroyed ${tn}`,
      });
  });
  const roshans = Math.max(1, Math.floor((min - 14) / 12));
  for (let i = 0; i < roshans; i++) {
    const team: 0 | 1 = r.chance(0.7) === radiant_win ? 0 : 1;
    objectives.push({
      time: Math.round((18 + i * 11) * 60 + r.int(-90, 180)),
      type: "roshan",
      team,
      label: `${team === 0 ? "Radiant" : "Dire"} slew Roshan · Aegis claimed`,
      heroId: (team === 0 ? radHeroes : dirHeroes)[0],
    });
  }
  objectives.push({
    time: duration - r.int(120, 300),
    type: "barracks",
    team: radiant_win ? 0 : 1,
    label: `${
      radiant_win ? "Radiant" : "Dire"
    } broke high ground · Barracks destroyed`,
  });
  objectives.push({
    time: duration,
    type: "throne",
    team: radiant_win ? 0 : 1,
    label: `${radiant_win ? "Dire" : "Radiant"} Ancient destroyed`,
  });
  objectives.sort((a, b) => a.time - b.time);

  const radiant_score = players
    .filter((p) => p.isRadiant)
    .reduce((s, p) => s + p.kills, 0);
  const dire_score = players
    .filter((p) => !p.isRadiant)
    .reduce((s, p) => s + p.kills, 0);

  return {
    match_id: id,
    start_time,
    duration,
    game_mode,
    lobby_type,
    radiant_win,
    radiant_score,
    dire_score,
    parsed,
    region: pro
      ? "Europe West"
      : hintPlayer?.country === "VN"
        ? "SE Asia"
        : r.pick(REGIONS),
    avg_rank_tier: pro ? 80 : (hintPlayer?.rank_tier ?? r.int(45, 75)),
    radiant_team: pro
      ? {
          team_id: pro.radiant_team_id,
          name: getTeam(pro.radiant_team_id).name,
          tag: getTeam(pro.radiant_team_id).tag,
        }
      : undefined,
    dire_team: pro
      ? {
          team_id: pro.dire_team_id,
          name: getTeam(pro.dire_team_id).name,
          tag: getTeam(pro.dire_team_id).tag,
        }
      : undefined,
    league: pro
      ? { leagueid: pro.leagueid, name: getLeague(pro.leagueid).name }
      : undefined,
    series: pro ? `${pro.series_type} · ${pro.stage}` : undefined,
    players,
    picks_bans,
    radiant_gold_adv: gold,
    radiant_xp_adv: xp,
    teamfights,
    objectives,
  };
});

export const isWin = (m: Pick<PlayerMatch, "player_slot" | "radiant_win">) =>
  m.player_slot < 128 === m.radiant_win;
