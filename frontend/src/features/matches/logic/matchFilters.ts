import type { PlayerMatch } from "@/shared/types/domain";
import { isWin } from "@/features/matches/data/matches";
import { fmtDate, NOW } from "@/shared/utils/format";

type Option<T, L> = { value: T; label: L };

export interface MatchGroup {
  label: string;
  rows: PlayerMatch[];
}

export type Mode = "all" | "ranked" | "unranked" | "turbo";

export type Result = "all" | "win" | "loss";

export type Sort = "recent" | "kda" | "gpm" | "duration";

export type Range = "all" | "7" | "30";

export interface Filters {
  mode: Mode;
  result: Result;
  hero: number | null;
  lane: number | null;
  parsedOnly: boolean;
  party: "any" | "solo" | "party";
  range: Range;
}

export type FilterKey = keyof Filters;

export const DEFAULT: Filters = {
  mode: "all",
  result: "all",
  hero: null,
  lane: null,
  parsedOnly: false,
  party: "any",
  range: "all",
};

export const SORTS: Option<Sort, string>[] = [
  { value: "recent", label: "Most recent" },
  { value: "kda", label: "Best KDA" },
  { value: "gpm", label: "Highest GPM" },
  { value: "duration", label: "Longest duration" },
];

export function applyMatchFilters(rows: PlayerMatch[], f: Filters) {
  return rows.filter((m) => {
    if (f.mode === "ranked" && !(m.lobby_type === 7 && m.game_mode !== 23))
      return false;
    if (f.mode === "unranked" && !(m.lobby_type === 0 && m.game_mode !== 23))
      return false;
    if (f.mode === "turbo" && m.game_mode !== 23) return false;
    if (f.result === "win" && !isWin(m)) return false;
    if (f.result === "loss" && isWin(m)) return false;
    if (f.hero && m.hero_id !== f.hero) return false;
    if (f.lane && m.lane_role !== f.lane) return false;
    if (f.parsedOnly && !m.parsed) return false;
    if (f.party === "solo" && m.party_size > 1) return false;
    if (f.party === "party" && m.party_size === 1) return false;
    if (f.range !== "all" && m.start_time < NOW - Number(f.range) * 86400)
      return false;
    return true;
  });
}

export function dayLabel(t: number) {
  const d = new Date(t * 1000);
  const today = new Date(NOW * 1000);
  const y = new Date(today);
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return fmtDate(t, { weekday: "short", month: "short", day: "numeric" });
}
