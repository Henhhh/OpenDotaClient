import { useState } from "react";
import { Pressable, View, ScrollView, RefreshControl } from "react-native";
import {
  ME_ID,
  getPlayer,
  playerPeers,
  playerTotals,
  playerCounts,
  ratingHistory,
  type RangeKey,
} from "@/features/players/data/players";
import { playerMatches } from "@/features/matches/data/matches";
import { fmtPct, fmtNum, relTime, kdaRatio } from "@/shared/utils/format";
import { Art } from "@/shared/ui/Art";
import { Card } from "@/shared/ui/Card";
import { Distribution } from "@/shared/ui/Distribution";
import { Choices } from "@/shared/ui/Choices";
import { Empty } from "@/shared/ui/Empty";
import { Section } from "@/shared/ui/Section";
import { Spark } from "@/shared/ui/Spark";
import { Txt } from "@/shared/ui/Txt";
import { MatchRow } from "@/features/matches/components/MatchRow";
import { Matches } from "@/features/matches/screens/MatchesScreen";
import { C, s } from "@/shared/theme/theme";
import { go } from "@/shared/navigation/navigation";
import { ProfileHeader } from "@/features/players/components/ProfileHeader";
import { RecentForm } from "@/features/players/components/RecentForm";
import { Performance } from "@/features/players/components/Performance";
import { PlayerHeroList } from "@/features/players/components/PlayerHeroList";

export function Profile({
  id = ME_ID,
  refreshing = false,
  onRefresh,
}: {
  id?: number;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const [tab, setTab] = useState("Overview"),
    [sort, setSort] = useState("Most played"),
    [range, setRange] = useState("All time");
  if (!getPlayer(id)) return <Empty text="Private or unknown player profile" />;
  const rangeKey: RangeKey =
    range === "7 days"
      ? "7"
      : range === "30 days"
        ? "30"
        : range === "6 months"
          ? "180"
          : "all";
  const total = playerTotals(id, rangeKey);
  return (
    <ScrollView
      stickyHeaderIndices={[1]}
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
      <ProfileHeader id={id} />
      <View style={{ backgroundColor: C.bg }}>
        <Choices
          items={["Overview", "Matches", "Heroes", "Peers", "Statistics"]}
          value={tab}
          onChange={setTab}
        />
      </View>
      {tab === "Overview" && (
        <>
          <Section title="Recent form" eyebrow="Last 20 matches" />
          <RecentForm id={id} />
          <Section title="Performance trend" />
          <Performance id={id} />
          <Section
            title="Recent matches"
            action="See all"
            onPress={() => setTab("Matches")}
          />
          {playerMatches(id)
            .slice(0, 5)
            .map((m) => (
              <MatchRow key={m.match_id} m={m} />
            ))}
          <Section
            title="Top heroes"
            action="See all"
            onPress={() => setTab("Heroes")}
          />
          <PlayerHeroList id={id} limit={5} />
          <Section title="Roles played" />
          <Card>
            <Distribution parts={playerCounts(id).position} />
          </Card>
          <Section title="Rank history" />
          <Card>
            {ratingHistory(id) ? (
              <>
                <Txt bold size={24}>
                  {getPlayer(id)?.mmr_estimate?.toLocaleString()}
                </Txt>
                <Spark values={ratingHistory(id)!.map((r) => r.value)} />
                <Txt muted>
                  Estimated sample results — not an official MMR value.
                </Txt>
              </>
            ) : (
              <Txt muted>No rating history available.</Txt>
            )}
          </Card>
        </>
      )}
      {tab === "Matches" && <Matches accountId={id} />}
      {tab === "Heroes" && (
        <>
          <Choices
            segmented
            items={["Most played", "Win rate", "Recent"]}
            value={sort}
            onChange={setSort}
          />
          <PlayerHeroList id={id} sort={sort} />
        </>
      )}
      {tab === "Peers" && (
        <Card>
          {playerPeers(id).map((p) => {
            const peer = getPlayer(p.account_id)!;
            return (
              <Pressable
                key={p.account_id}
                onPress={() => go("player", { id: p.account_id })}
                style={[s.row, s.divider]}
              >
                <Art hero={peer.avatarHero} />
                <View style={{ flex: 1 }}>
                  <Txt bold>{peer.name}</Txt>
                  <Txt muted>
                    {p.games} games together · {relTime(p.last_played)}
                  </Txt>
                </View>
                <Txt color={p.win / p.games > 0.5 ? C.win : C.loss}>
                  {fmtPct(p.win / p.games)}
                </Txt>
              </Pressable>
            );
          })}
        </Card>
      )}
      {tab === "Statistics" && (
        <>
          <Choices
            items={["7 days", "30 days", "6 months", "All time"]}
            value={range}
            onChange={setRange}
          />
          <Section
            title="Totals"
            eyebrow={`${fmtNum(total.games)} matches · ${range}`}
          />
          <Card>
            <View style={s.between}>
              <Txt>Win rate {fmtPct(total.wins / total.games)}</Txt>
              <Txt>
                KDA{" "}
                {kdaRatio(total.kills, total.deaths, total.assists).toFixed(2)}
              </Txt>
            </View>
            <Txt>
              Time played {Math.round(total.duration / 3600).toLocaleString()}h
            </Txt>
            <View style={s.wrap}>
              {Object.entries({
                Kills: total.kills,
                Deaths: total.deaths,
                Assists: total.assists,
                "Last hits": total.last_hits,
                "Average GPM": total.gpm,
                "Average XPM": total.xpm,
                "Hero damage": total.hero_damage,
                "Tower damage": total.tower_damage,
              }).map(([k, v]) => (
                <View
                  key={k}
                  style={{
                    width: "48%",
                    backgroundColor: C.raised,
                    padding: 12,
                    borderRadius: 12,
                  }}
                >
                  <Txt muted>{k}</Txt>
                  <Txt bold size={20}>
                    {fmtNum(v)}
                  </Txt>
                </View>
              ))}
            </View>
          </Card>
        </>
      )}
    </ScrollView>
  );
}
