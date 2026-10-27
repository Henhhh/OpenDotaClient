import { View } from "react-native";
import type { Team, ProPlayer, MatchSummary } from "@/shared/api/client";
import { ApiState, numberText } from "@/shared/ui/ApiState";
import { Txt } from "@/shared/ui/Txt";
import { Section } from "@/shared/ui/Section";
import { Button } from "@/shared/ui/Button";
import { Notice } from "@/shared/ui/Notice";
import { useFavorite } from "@/shared/state/AppState";
import { usePro, useProList } from "../api/queries";
import {
  TeamCard,
  PlayerCardApi,
  MatchCardApi,
  PagedState,
} from "../components/ApiCards";
export function TeamDetail({ id }: { id: string }) {
  const valid = /^[1-9][0-9]{0,19}$/.test(id),
    team = usePro<Team>(`/pro/teams/${id}`, valid);
  const roster = useProList<ProPlayer>(
      `/pro/teams/${id}/players`,
      {},
      valid && !!team.data,
    ),
    matches = useProList<MatchSummary>(
      `/pro/teams/${id}/matches`,
      {},
      valid && !!team.data,
    );
  const [fav, toggle, status] = useFavorite("teams", id);
  if (!valid) return <Notice>Invalid team ID.</Notice>;
  if (!team.data)
    return (
      <ApiState
        pending={team.isPending}
        error={team.error}
        retry={() => void team.refetch()}
      />
    );
  return (
    <View style={{ gap: 12 }}>
      <TeamCard team={team.data.data} />
      <Txt muted>Rating {numberText(team.data.data.rating)}</Txt>
      <Button onPress={toggle}>
        {status.pending
          ? "Saving…"
          : fav
            ? "Remove team favorite"
            : "Favorite team"}
      </Button>
      {status.error && <Notice>{status.error.message}</Notice>}
      <Section title="Players who played for this team" />
      {roster.data?.pages
        .flatMap((p) => p.data.items)
        .map((p) => (
          <PlayerCardApi key={p.account_id} player={p} />
        ))}
      <PagedState
        query={roster}
        empty={!roster.data?.pages[0].data.items.length}
      />
      <Section title="Recent matches" />
      {matches.data?.pages
        .flatMap((p) => p.data.items)
        .map((m) => (
          <MatchCardApi key={m.match_id} match={m} />
        ))}
      <PagedState
        query={matches}
        empty={!matches.data?.pages[0].data.items.length}
      />
    </View>
  );
}
