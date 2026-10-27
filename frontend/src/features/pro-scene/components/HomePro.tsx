import { View } from "react-native";
import type { MatchSummary, League } from "@/shared/api/client";
import { useProList } from "../api/queries";
import { MatchCardApi, LeagueCardApi } from "./ApiCards";
import { ApiState } from "@/shared/ui/ApiState";
export function HomePro({ kind }: { kind: "matches" | "leagues" }) {
  const matches = useProList<MatchSummary>(
      "/pro/matches",
      {},
      kind === "matches",
    ),
    leagues = useProList<League>("/pro/leagues", {}, kind === "leagues");
  const query = kind === "matches" ? matches : leagues;
  return (
    <View style={{ gap: 10 }}>
      <ApiState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {kind === "matches"
        ? matches.data?.pages[0].data.items
            .slice(0, 1)
            .map((m) => <MatchCardApi key={m.match_id} match={m} />)
        : leagues.data?.pages[0].data.items
            .slice(0, 3)
            .map((l) => <LeagueCardApi key={l.league_id} league={l} />)}
    </View>
  );
}
