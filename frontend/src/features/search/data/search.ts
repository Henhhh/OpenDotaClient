import { HEROES } from "@/features/heroes/data/heroes";
import { PLAYERS } from "@/features/players/data/players";
import { LEAGUES, TEAMS } from "@/features/pro-scene/data/pro";

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");

export type SearchCategory = "all" | "players" | "heroes" | "teams" | "matches";

/** Local stand-in for GET /search?q= (players) plus client-side hero/team/league lookups. */
export function searchAll(q: string) {
  const n = norm(q.trim());
  if (!n)
    return {
      players: [],
      heroes: [],
      teams: [],
      leagues: [],
      matchId: null as number | null,
    };
  const digits = /^\d{6,12}$/.test(n) ? Number(n) : null;
  const players = PLAYERS.filter(
    (p) =>
      norm(p.name).includes(n) ||
      String(p.account_id).startsWith(n) ||
      norm(p.pro?.realName ?? "").includes(n),
  ).slice(0, 8);
  const heroes = HEROES.filter(
    (h) => norm(h.name).includes(n) || h.key.includes(n.replace(/\s+/g, "_")),
  ).slice(0, 9);
  const teams = TEAMS.filter(
    (t) => norm(t.name).includes(n) || norm(t.tag).includes(n),
  );
  const leagues = LEAGUES.filter((l) => norm(l.name).includes(n));
  return {
    players,
    heroes,
    teams,
    leagues,
    matchId: digits && digits > 100000 ? digits : null,
  };
}

export const TRENDING = [
  "Yatoro",
  "Invoker",
  "Team Liquid",
  "DreamLeague",
  "Pudge",
  "Gaimin Gladiators",
  "Collapse",
  "Largo",
];
