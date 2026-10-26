import { playerMatches } from "@/features/matches/data/matches";
import { ME_ID } from "@/features/players/data/players";
import { HEROES } from "@/features/heroes/data/heroes";
import { LEAGUES, TEAMS } from "@/features/pro-scene/data/pro";

/** Deliberately serves design fixtures until the backend is implemented. */
export async function loadCatalog() {
  return {
    heroes: HEROES,
    matches: playerMatches(ME_ID),
    teams: TEAMS,
    leagues: LEAGUES,
    refreshedAt: Date.now(),
    source: "sample" as const,
  };
}

