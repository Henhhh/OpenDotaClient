import { View } from "react-native";
import type { League, Team, MatchSummary } from "@/shared/api/client";
import { ApiState } from "@/shared/ui/ApiState";
import { Txt } from "@/shared/ui/Txt";
import { Card } from "@/shared/ui/Card";
import { Notice } from "@/shared/ui/Notice";
import { Section } from "@/shared/ui/Section";
import { usePro, useProList } from "../api/queries";
import { TeamCard, MatchCardApi, PagedState } from "../components/ApiCards";
export function LeagueDetail({ id }: { id: string }) {
  const valid = /^[1-9][0-9]{0,19}$/.test(id),
    league = usePro<League>(`/pro/leagues/${id}`, valid),
    teams = useProList<Team>(
      `/pro/leagues/${id}/teams`,
      {},
      valid && !!league.data,
    ),
    matches = useProList<MatchSummary>(
      `/pro/leagues/${id}/matches`,
      {},
      valid && !!league.data,
    );
  if (!valid) return <Notice>Invalid league ID.</Notice>;
  if (!league.data)
    return (
      <ApiState
        pending={league.isPending}
        error={league.error}
        retry={() => void league.refetch()}
      />
    );
  const l = league.data.data;
  return (
    <View style={{ gap: 12 }}>
      <Card>
        <Txt bold size={22}>
          {l.name}
        </Txt>
        <Txt>{l.tier ?? "Tier unavailable"}</Txt>
        <Txt muted>
          {l.status ?? "Schedule unavailable"} ·{" "}
          {l.prize_usd == null
            ? "Prize unavailable"
            : `$${l.prize_usd.toLocaleString()}`}
        </Txt>
      </Card>
      <Section title="Teams" />
      {teams.data?.pages
        .flatMap((p) => p.data.items)
        .map((t) => (
          <TeamCard key={t.team_id} team={t} />
        ))}
      <PagedState
        query={teams}
        empty={!teams.data?.pages[0].data.items.length}
      />
      <Section title="Matches" />
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
