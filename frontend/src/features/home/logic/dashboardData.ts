import { HEROES, heroStats } from "@/features/heroes/data/heroes";
import { isWin, playerMatches } from "@/features/matches/data/matches";
import { ME, playerHeroes } from "@/features/players/data/players";
import { LEAGUES, PRO_MATCHES } from "@/features/pro-scene/data/pro";
import { kdaRatio } from "@/shared/utils/format";

export function getDashboardData() {
  const matches = playerMatches(ME.account_id);
  const last20 = matches.slice(0, 20);
  const w20 = last20.filter(isWin).length;
  const avgKda =
    last20.reduce((s, m) => s + kdaRatio(m.kills, m.deaths, m.assists), 0) /
    last20.length;
  const avgGpm = last20.reduce((s, m) => s + m.gold_per_min, 0) / last20.length;
  const highlights = [...matches.slice(0, 12)]
    .sort(
      (a, b) =>
        kdaRatio(b.kills, b.deaths, b.assists) -
        kdaRatio(a.kills, a.deaths, a.assists),
    )
    .slice(0, 3);
  const featured =
    PRO_MATCHES.find((m) => m.stage === "Grand Final") ?? PRO_MATCHES[0];
  const mostPlayed = playerHeroes(ME.account_id).slice(0, 5);
  const movers = [...HEROES]
    .map((h) => {
      const tr = heroStats(h.id).trend;
      return { h, delta: tr[tr.length - 1] - tr[0], tr };
    })
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 4);
  const events = LEAGUES.filter((l) => l.status !== "completed").sort(
    (a, b) => a.start - b.start,
  );
  return {
    matches,
    last20,
    w20,
    avgKda,
    avgGpm,
    highlights,
    featured,
    mostPlayed,
    movers,
    events,
  };
}
