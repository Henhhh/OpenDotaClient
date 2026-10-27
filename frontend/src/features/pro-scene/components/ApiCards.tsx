import { Pressable, View } from "react-native";
import type {
  Team,
  League,
  ProPlayer,
  MatchSummary,
} from "@/shared/api/client";
import { Card } from "@/shared/ui/Card";
import { Txt } from "@/shared/ui/Txt";
import { Button } from "@/shared/ui/Button";
import { RemoteImage, ApiState, numberText, rate } from "@/shared/ui/ApiState";
import { C, s } from "@/shared/theme/theme";
import { go } from "@/shared/navigation/navigation";
export function TeamCard({ team: t }: { team: Team }) {
  const total = t.wins == null || t.losses == null ? null : t.wins + t.losses;
  return (
    <Pressable onPress={() => go("team", { id: t.team_id })}>
      <Card>
        <View style={s.row}>
          <RemoteImage uri={t.logo_url} width={40} height={40} />
          <View style={{ flex: 1 }}>
            <Txt bold>{t.name}</Txt>
            <Txt muted>
              {t.region ?? "Region unavailable"} · {numberText(total)} matches
            </Txt>
            <Txt color={C.win}>
              {rate(total && t.wins != null ? t.wins / total : null)}
            </Txt>
          </View>
          <Txt color={C.gold}>{numberText(t.rating)}</Txt>
        </View>
      </Card>
    </Pressable>
  );
}
export function LeagueCardApi({ league: l }: { league: League }) {
  return (
    <Pressable onPress={() => go("league", { id: l.league_id })}>
      <Card>
        <Txt bold>{l.name}</Txt>
        <Txt muted>
          {l.tier ?? "Tier unavailable"} · {l.status ?? "Schedule unavailable"}
        </Txt>
        {l.prize_usd != null && (
          <Txt color={C.gold}>${l.prize_usd.toLocaleString()}</Txt>
        )}
      </Card>
    </Pressable>
  );
}
export function PlayerCardApi({ player: p }: { player: ProPlayer }) {
  return (
    <Pressable onPress={() => go("player", { id: p.account_id })}>
      <Card>
        <View style={s.row}>
          <RemoteImage uri={p.avatar_url} width={40} height={40} />
          <View style={{ flex: 1 }}>
            <Txt bold>{p.name ?? `Player ${p.account_id}`}</Txt>
            <Txt muted>
              {p.team_name ?? "Team unavailable"} ·{" "}
              {p.role ?? "Role unavailable"}
            </Txt>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}
export function MatchCardApi({ match: m }: { match: MatchSummary }) {
  return (
    <Card>
      <Txt muted>
        Match {m.match_id} ·{" "}
        {new Date(m.start_time * 1000).toLocaleDateString()}
      </Txt>
      <View style={s.between}>
        <Pressable
          accessibilityRole="button"
          disabled={!m.radiant_team_id}
          style={{ flex: 1, minWidth: 0 }}
          onPress={() =>
            m.radiant_team_id && go("team", { id: m.radiant_team_id })
          }
        >
          <Txt>
            {m.radiant_team_id ? `Team ${m.radiant_team_id}` : "Radiant"}
          </Txt>
        </Pressable>
        <Txt bold size={20}>
          {numberText(m.radiant_score)} : {numberText(m.dire_score)}
        </Txt>
        <Pressable
          accessibilityRole="button"
          disabled={!m.dire_team_id}
          style={{ flex: 1, minWidth: 0 }}
          onPress={() => m.dire_team_id && go("team", { id: m.dire_team_id })}
        >
          <Txt>{m.dire_team_id ? `Team ${m.dire_team_id}` : "Dire"}</Txt>
        </Pressable>
      </View>
      <Txt muted>
        {Math.floor(m.duration / 60)} min ·{" "}
        {m.radiant_win == null
          ? "Result unavailable"
          : m.radiant_win
            ? "Radiant victory"
            : "Dire victory"}
      </Txt>
      <Button onPress={() => go("match", { id: m.match_id })}>
        View match details
      </Button>
    </Card>
  );
}
export function PagedState({
  query,
  empty,
}: {
  query: {
    isPending: boolean;
    error: Error | null;
    refetch: () => unknown;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    fetchNextPage: () => unknown;
  };
  empty: boolean;
}) {
  return (
    <>
      <ApiState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {!query.isPending && !query.error && empty && (
        <Txt muted>No results found.</Txt>
      )}
      {query.hasNextPage && (
        <Button
          onPress={() => {
            if (!query.isFetchingNextPage) void query.fetchNextPage();
          }}
        >
          {query.isFetchingNextPage ? "Loading…" : "Load more"}
        </Button>
      )}
    </>
  );
}
