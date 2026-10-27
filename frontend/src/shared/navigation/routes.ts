/** Screen names stay stable; only this map owns their public URLs. */
export const ROUTES = {
  home: "/main",
  matches: "/main/matches",
  heroes: "/main/heroes",
  pro: "/main/pro",
  profile: "/main/profile",
  hero: "/heroes/detail",
  heroRanks: "/heroes/ranks",
  build: "/heroes/build",
  match: "/matches/detail",
  player: "/players/detail",
  compare: "/players/compare",
  live: "/pro-scene/live",
  rankings: "/pro-scene/rankings",
  team: "/pro-scene/team",
  league: "/pro-scene/league",
  settings: "/account/settings",
  favorites: "/account/favorites",
  notifications: "/account/notifications",
  search: "/search",
} as const;

export const MAIN_TABS = [
  ["home", "Home", ROUTES.home],
  ["matches", "Matches", ROUTES.matches],
  ["heroes", "Heroes", ROUTES.heroes],
  ["pro", "Pro Scene", ROUTES.pro],
  ["profile", "Profile", ROUTES.profile],
] as const;

export function routePath(name: string) {
  return ROUTES[name as keyof typeof ROUTES] ?? `/${name}`;
}

export function defaultTabForPath(path: string) {
  if (path.startsWith("/heroes/")) return "heroes";
  if (path.startsWith("/matches/")) return "matches";
  if (path.startsWith("/pro-scene/")) return "pro";
  if (path.startsWith("/account/")) return "profile";
  return "home";
}
