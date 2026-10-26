export const NOW = Math.floor(Date.now() / 1000);

export function fmtDuration(sec: number) {
  const neg = sec < 0;
  const s = Math.abs(Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, "0");
  const body = h > 0 ? `${h}:${String(m).padStart(2, "0")}:${r}` : `${m}:${r}`;
  return neg ? `-${body}` : body;
}

export function fmtNum(n: number) {
  return Math.round(n).toLocaleString("en-US");
}

export function fmtK(n: number, digits = 1) {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(digits)}M`;
  if (a >= 10_000) return `${(n / 1000).toFixed(digits)}k`;
  if (a >= 1000) return `${(n / 1000).toFixed(digits)}k`;
  return String(Math.round(n));
}

export function fmtPct(v: number, digits = 1) {
  return `${(v * 100).toFixed(digits)}%`;
}

export function winRate(w: number, l: number) {
  return w + l === 0 ? 0 : w / (w + l);
}

export function kdaRatio(k: number, d: number, a: number) {
  return (k + a) / Math.max(1, d);
}

export function relTime(unix: number) {
  const diff = NOW - unix;
  if (diff < 0) {
    const f = -diff;
    if (f < 3600) return `in ${Math.max(1, Math.round(f / 60))}m`;
    if (f < 86400) return `in ${Math.round(f / 3600)}h`;
    return `in ${Math.round(f / 86400)}d`;
  }
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  if (diff < 86400 * 30) return `${Math.round(diff / 86400)}d ago`;
  if (diff < 86400 * 365) return `${Math.round(diff / (86400 * 30))}mo ago`;
  return `${Math.round(diff / (86400 * 365))}y ago`;
}

/** Relative time from a millisecond timestamp, measured against the live clock. */
export function sinceMs(ms: number) {
  const diff = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

export function fmtDate(
  unix: number,
  opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  },
) {
  return new Date(unix * 1000).toLocaleDateString("en-US", opts);
}

export function fmtDateTime(unix: number) {
  return new Date(unix * 1000).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtMatchId(id: number) {
  return String(id);
}

export function wrTone(wr: number) {
  if (wr >= 0.53) return "text-win";
  if (wr <= 0.47) return "text-loss";
  return "text-fg";
}

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export const GAME_MODES: Record<number, string> = {
  1: "All Pick",
  2: "Captains Mode",
  3: "Random Draft",
  4: "Single Draft",
  5: "All Random",
  16: "Captains Draft",
  18: "Ability Draft",
  22: "All Pick",
  23: "Turbo",
};

export const LOBBY_TYPES: Record<number, string> = {
  0: "Unranked",
  1: "Practice",
  2: "Tournament",
  7: "Ranked",
};

export const LANE_ROLES: Record<number, string> = {
  1: "Safe lane",
  2: "Mid lane",
  3: "Off lane",
  4: "Jungle",
};

export const POSITION_LABEL: Record<string, string> = {
  carry: "Carry",
  mid: "Mid",
  offlane: "Offlane",
  support: "Support",
};
