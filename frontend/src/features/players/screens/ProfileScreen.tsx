import { useState } from "react";
import { Pressable, View, ScrollView, RefreshControl } from "react-native";
import {
  ApiError,
  type Peer,
  type PlayerStats,
  type RankPoint,
  type Page,
  type PlayerMatch,
} from "@/shared/api/client";
import { MatchRow } from "@/features/matches/components/MatchRow";
import { usePlayerApi, usePlayerPages, validAccount } from "../api/queries";
import { AccountPicker, useViewedAccount } from "../components/AccountPicker";
import { ProfileHeader } from "../components/ProfileHeader";
import { RecentForm } from "../components/RecentForm";
import { Performance } from "../components/Performance";
import { PlayerHeroList } from "../components/PlayerHeroList";
import { Matches } from "@/features/matches/screens/MatchesScreen";
import { ApiState, RemoteImage, rate, numberText } from "@/shared/ui/ApiState";
import { Section } from "@/shared/ui/Section";
import { Choices } from "@/shared/ui/Choices";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Notice } from "@/shared/ui/Notice";
import { Txt } from "@/shared/ui/Txt";
import { C, s } from "@/shared/theme/theme";
import { go } from "@/shared/navigation/navigation";
import { rankLabel } from "@/shared/utils/assets";
export function Profile({
  id,
  refreshing = false,
  onRefresh,
}: {
  id?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const selected = useViewedAccount(),
    account = id ?? selected;
  const [tab, setTab] = useState("Overview"),
    [sort, setSort] = useState("Most played"),
    [scope, setScope] = useState("All time");
  if (!validAccount(account))
    return <Notice>Invalid player account ID.</Notice>;
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ gap: 12, padding: 14, paddingBottom: 30 }}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.red}
          />
        ) : undefined
      }
    >
      {!id && <AccountPicker />}
      <ProfileHeader id={account} />
      <Choices
        items={["Overview", "Matches", "Heroes", "Peers", "Statistics"]}
        value={tab}
        onChange={setTab}
      />
      {tab === "Overview" && (
        <>
          <Section title="Recent form" eyebrow="Up to 20 matches" />
          <RecentForm id={account} />
          <Section title="Performance trend" />
          <Performance id={account} />
          <Section
            title="Recent matches"
            action="See all"
            onPress={() => setTab("Matches")}
          />
          <RecentMatches id={account} />
          <Section
            title="Top heroes"
            action="See all"
            onPress={() => setTab("Heroes")}
          />
          <PlayerHeroList id={account} limit={5} />
          <Section title="Rank history" />
          <RankHistory key={account} id={account} />
          <Notice>
            Role distribution and estimated MMR are unavailable in API v1.
          </Notice>
        </>
      )}
      {tab === "Matches" && <Matches key={account} accountId={account} />}
      {tab === "Heroes" && (
        <>
          <Choices
            segmented
            items={["Most played", "Win rate"]}
            value={sort}
            onChange={setSort}
          />
          <PlayerHeroList id={account} sort={sort} />
        </>
      )}
      {tab === "Peers" && <Peers key={account} id={account} />}
      {tab === "Statistics" && (
        <>
          <Choices
            segmented
            items={["All time", "Recent"]}
            value={scope}
            onChange={setScope}
          />
          <Statistics
            id={account}
            scope={scope === "Recent" ? "recent" : "all_time"}
          />
        </>
      )}
    </ScrollView>
  );
}
function RecentMatches({ id }: { id: string }) {
  const q = usePlayerApi<Page<PlayerMatch>>(`/players/${id}/matches`, {
    limit: 5,
  });
  return (
    <View>
      <ApiState
        pending={q.isPending}
        error={q.error}
        retry={() => void q.refetch()}
      />
      {q.data && !q.data.data.items.length && (
        <Txt muted>No recent matches.</Txt>
      )}
      {q.data?.data.items.map((m) => (
        <MatchRow key={m.match_id} m={m} />
      ))}
    </View>
  );
}
function Peers({ id }: { id: string }) {
  const q = usePlayerPages<Peer>(`/players/${id}/peers`);
  const rows = q.data?.pages.flatMap((p) => p.data.items) ?? [];
  return (
    <Card>
      <ApiState
        pending={q.isPending}
        error={q.error}
        retry={() => void q.refetch()}
      />
      {q.data && !rows.length && <Txt muted>No peers available.</Txt>}
      {rows.map((p) => (
        <Pressable
          key={p.account_id}
          onPress={() => go("player", { id: p.account_id })}
          style={s.row}
        >
          <RemoteImage uri={p.avatar_url} width={38} height={38} />
          <View style={{ flex: 1 }}>
            <Txt bold>{p.name ?? p.account_id}</Txt>
            <Txt muted>{p.games} games together</Txt>
          </View>
          <Txt>{rate(p.win_rate)}</Txt>
        </Pressable>
      ))}
      {q.hasNextPage && (
        <Button
          onPress={() => {
            if (!q.isFetchingNextPage) void q.fetchNextPage();
          }}
        >
          Load more peers
        </Button>
      )}
    </Card>
  );
}
function RankHistory({ id }: { id: string }) {
  const q = usePlayerPages<RankPoint>(`/players/${id}/rank-history`);
  return (
    <Card>
      <ApiState
        pending={q.isPending}
        error={
          q.error instanceof ApiError && q.error.status === 501
            ? new Error("Rank history is unavailable for this player.")
            : q.error
        }
        retry={() => void q.refetch()}
      />
      {q.data?.pages
        .flatMap((p) => p.data.items)
        .map((p) => (
          <View key={p.time} style={s.between}>
            <Txt muted>{new Date(p.time * 1000).toLocaleDateString()}</Txt>
            <Txt>
              {rankLabel(p.rank_tier)} · MMR {numberText(p.mmr)}
            </Txt>
          </View>
        ))}
      {q.hasNextPage && (
        <Button
          onPress={() => {
            if (!q.isFetchingNextPage) void q.fetchNextPage();
          }}
        >
          Load more rank history
        </Button>
      )}
    </Card>
  );
}
function Statistics({ id, scope }: { id: string; scope: string }) {
  const q = usePlayerApi<PlayerStats>(`/players/${id}/stats`, { scope }),
    d = q.data?.data;
  return (
    <Card>
      <Txt bold>Statistics</Txt>
      <ApiState
        pending={q.isPending}
        error={q.error}
        retry={() => void q.refetch()}
      />
      {d && (
        <>
          <Txt>
            {d.matches} matches · {d.sample_size} samples
          </Txt>
          <Txt>
            Win rate {rate(d.win_rate)} · {d.wins}W / {d.losses}L
          </Txt>
          {(
            [
              ["KDA", d.kda],
              ["Average kills", d.avg_kills],
              ["Average deaths", d.avg_deaths],
              ["Average assists", d.avg_assists],
              ["Average GPM", d.avg_gpm],
              ["Average XPM", d.avg_xpm],
            ] as const
          ).map(([label, value]) => (
            <View key={label} style={s.between}>
              <Txt muted>{label}</Txt>
              <Txt bold>{value == null ? "—" : value.toFixed(2)}</Txt>
            </View>
          ))}
          <Txt muted>
            Different source statistics may cover different samples.
            Date-specific totals are unavailable in API v1.
          </Txt>
        </>
      )}
    </Card>
  );
}
