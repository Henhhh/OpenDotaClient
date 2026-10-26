import type { Route } from "@/shared/navigation/types";
import { NOW } from "@/shared/utils/format";
import { getHero } from "@/features/heroes/data/heroes";
import { playerMatches, isWin } from "@/features/matches/data/matches";
import { ME_ID, getPlayer } from "@/features/players/data/players";
import { LEAGUES, PRO_MATCHES, getTeam } from "@/features/pro-scene/data/pro";

export type NotifKind = "match" | "favorite" | "pro" | "tournament" | "system";

export interface AppNotification {
  id: string;
  kind: NotifKind;
  title: string;
  body: string;
  time: number;
  route?: Route;
  heroId?: number;
}

/** Local, in-app alerts generated from sample data – no push service is connected. */
export const NOTIFICATIONS: AppNotification[] = (() => {
  const mine = playerMatches(ME_ID);
  const yatoro = getPlayer(311360822);
  const out: AppNotification[] = [];
  mine.slice(0, 3).forEach((m, i) => {
    const h = getHero(m.hero_id);
    out.push({
      id: `m-${m.match_id}`,
      kind: "match",
      title: isWin(m) ? `Victory as ${h.name}` : `Defeat as ${h.name}`,
      body: `${m.kills}/${m.deaths}/${m.assists} · ${m.gold_per_min} GPM${
        i === 0 ? " · New personal best hero damage" : ""
      }`,
      time: m.start_time + m.duration,
      route: { name: "match", id: m.match_id },
      heroId: m.hero_id,
    });
  });
  if (yatoro) {
    const m = playerMatches(yatoro.account_id)[0];
    out.push({
      id: `f-${m.match_id}`,
      kind: "favorite",
      title: `${yatoro.name} finished a match`,
      body: `${
        isWin(m) ? "Won" : "Lost"
      } on ${getHero(m.hero_id).name} · ${m.kills}/${m.deaths}/${m.assists}`,
      time: m.start_time + m.duration + 300,
      route: { name: "match", id: m.match_id },
      heroId: m.hero_id,
    });
  }
  PRO_MATCHES.slice(0, 3).forEach((m) => {
    const w = getTeam(m.radiant_win ? m.radiant_team_id : m.dire_team_id);
    const l = getTeam(m.radiant_win ? m.dire_team_id : m.radiant_team_id);
    out.push({
      id: `p-${m.match_id}`,
      kind: "pro",
      title: `${w.name} defeat ${l.name}`,
      body: `${m.stage} · series ${Math.max(...m.series_score)}–${Math.min(...m.series_score)}`,
      time: m.start_time + m.duration,
      route: { name: "match", id: m.match_id },
    });
  });
  const live = LEAGUES.find((l) => l.status === "live")!;
  const up = LEAGUES.find((l) => l.status === "upcoming")!;
  out.push({
    id: `t-${live.leagueid}`,
    kind: "tournament",
    title: `${live.name} playoffs begin`,
    body: "Upper bracket quarterfinals are underway. Follow results in Pro Scene.",
    time: NOW - 9 * 3600,
    route: { name: "league", id: live.leagueid },
  });
  out.push({
    id: `t-${up.leagueid}`,
    kind: "tournament",
    title: `${up.name} starts soon`,
    body: `${up.location} · ${up.prize} prize pool`,
    time: NOW - 30 * 3600,
    route: { name: "league", id: up.leagueid },
  });
  out.push({
    id: "sys-sample",
    kind: "system",
    title: "You’re viewing sample data",
    body: "This prototype uses bundled, deterministic data. Live OpenDota requests are not made.",
    time: NOW - 3 * 86400,
    route: { name: "settings" },
  });
  return out.sort((a, b) => b.time - a.time);
})();
