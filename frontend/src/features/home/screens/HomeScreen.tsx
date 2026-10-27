import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { getDashboardData } from "@/features/home/logic/dashboardData";
import { getHero, heroStats } from "@/features/heroes/data/heroes";
import { Art } from "@/shared/ui/Art";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Icon } from "@/shared/ui/Icon";
import { Ring } from "@/shared/ui/Ring";
import { Section } from "@/shared/ui/Section";
import { Spark } from "@/shared/ui/Spark";
import { Txt } from "@/shared/ui/Txt";
import { C, s } from "@/shared/theme/theme";
import { go } from "@/shared/navigation/navigation";
import { ResultStrip } from "@/shared/ui/ResultStrip";
import { Performance } from "@/features/players/components/Performance";
import { PlayerHeroList } from "@/features/players/components/PlayerHeroList";
import { MatchRow } from "@/features/matches/components/MatchRow";
import { HomePro } from "@/features/pro-scene/components/HomePro";
import { Notice } from "@/shared/ui/Notice";
import { useAppState } from "@/shared/state/AppState";
import { ME } from "@/features/players/data/players";
import { isWin } from "@/features/matches/data/matches";
import { rankIcon } from "@/shared/utils/assets";
import { fmtPct } from "@/shared/utils/format";

export function Home() {
  const d = getDashboardData();
  const { state } = useAppState();
  return (
    <View style={{ gap: 12 }}>
      <View style={s.between}>
        <View>
          <Txt muted>Good evening,</Txt>
          <Txt bold size={24}>
            Kaito
          </Txt>
        </View>
        <Badge />
      </View>
      <Pressable
        onPress={() => go("search")}
        style={[s.input, s.row, { flex: undefined }]}
      >
        <Icon name="search" size={18} />
        <Txt muted>Search players, heroes, teams or match IDs</Txt>
      </Pressable>
      <Card>
        <View style={s.row}>
          <Art hero="storm_spirit" />
          <View style={{ flex: 1 }}>
            <Txt bold size={16}>
              Kaito <Text style={{ color: C.gold, fontSize: 10 }}>PLUS</Text>
            </Txt>
            <Txt muted>Ancient III · ~4,180 MMR est.</Txt>
          </View>
          <Image
            source={{ uri: rankIcon(63) }}
            style={{ width: 52, height: 52 }}
          />
        </View>
        <View style={s.row}>
          <Ring value={d.w20 / 20} />
          <View style={{ flex: 1, gap: 14 }}>
            <View style={s.between}>
              <View>
                <Txt muted size={9}>
                  RECORD
                </Txt>
                <Txt color={C.win} bold>
                  {d.w20}W <Text style={{ color: C.loss }}>{20 - d.w20}L</Text>
                </Txt>
              </View>
              <View>
                <Txt muted size={9}>
                  AVG KDA
                </Txt>
                <Txt bold>{d.avgKda.toFixed(2)}</Txt>
              </View>
            </View>
            <View style={s.between}>
              <View>
                <Txt muted size={9}>
                  AVG GPM
                </Txt>
                <Txt color={C.gold} bold>
                  {Math.round(d.avgGpm)}
                </Txt>
              </View>
              <View>
                <Txt muted size={9}>
                  ALL TIME
                </Txt>
                <Txt bold color={C.win}>
                  {fmtPct(ME.wins / (ME.wins + ME.losses))}
                </Txt>
              </View>
            </View>
          </View>
        </View>
        <ResultStrip results={[...d.last20].reverse().map(isWin)} />
        <Button onPress={() => go("profile")}>View profile</Button>
      </Card>
      <View style={s.wrap}>
        {[
          ["Match History", "48 recent games", "matches", "matches"],
          ["Hero Stats", "127 heroes", "heroes", "heroes"],
          ["Builds", "Storm Spirit", "build", "build"],
          ["Pro Scene", "Teams & results", "pro", "pro"],
        ].map(([label, sub, icon, route]) => (
          <Pressable
            key={label}
            onPress={() => go(route, route === "build" ? { heroId: 17 } : {})}
            style={[s.card, s.row, { width: "48.5%", padding: 12 }]}
          >
            <Icon
              name={icon}
              color={
                icon === "matches"
                  ? C.red
                  : icon === "heroes"
                    ? "#38bdf8"
                    : C.gold
              }
            />
            <View style={{ flex: 1 }}>
              <Txt bold size={12}>
                {label}
              </Txt>
              <Txt muted size={10}>
                {sub}
              </Txt>
            </View>
          </Pressable>
        ))}
      </View>
      <Section
        title="Performance overview"
        eyebrow="Last 20 matches"
        action="Stats"
        onPress={() => go("profile")}
      />
      <Performance />
      <Section
        title="Live matches"
        eyebrow="Availability"
        action="See all"
        onPress={() => go("live")}
      />
      <Notice>Live matches are not available yet.</Notice>
      <Section title="Quick access" eyebrow="More tools" />
      <View style={s.wrap}>
        {[
          ["Live", "live", "live"],
          ["Rankings", "pro", "rankings"],
          ["Favorites", "star", "favorites"],
          ["Compare", "compare", "compare"],
          ["Hero meta", "chart", "heroRanks"],
          ["Alerts", "bell", "notifications"],
        ].map(([label, icon, route]) => (
          <Pressable
            key={route}
            onPress={() => go(route)}
            style={[
              s.card,
              { width: "31.5%", alignItems: "center", paddingVertical: 20 },
            ]}
          >
            <Icon name={icon} color={C.gold} />
            <Txt bold size={11}>
              {label}
            </Txt>
          </Pressable>
        ))}
      </View>
      <Section
        title="Recent highlights"
        action="See all"
        onPress={() => go("matches")}
      />
      {d.highlights.map((m) => (
        <MatchRow key={m.match_id} m={m} />
      ))}
      <Section title="Latest professional match" />
      <HomePro kind="matches" />
      <Section
        title="Favorite heroes on this device"
        action="Manage"
        onPress={() => go("favorites")}
      />
      <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
        {state.heroes.map((id) => (
          <Pressable
            key={id}
            onPress={() => go("hero", { id })}
            style={{
              backgroundColor: C.card,
              borderRadius: 14,
              overflow: "hidden",
              width: 105,
            }}
          >
            <Art hero={getHero(id).key} width={105} height={65} />
            <View style={{ padding: 8 }}>
              <Txt bold size={11}>
                {getHero(id).name}
              </Txt>
              <Txt size={10}>{fmtPct(heroStats(id).winRate)} WR</Txt>
            </View>
          </Pressable>
        ))}
      </ScrollView>
      <Section
        title="Most played heroes"
        action="See all"
        onPress={() => go("profile")}
      />
      <PlayerHeroList limit={5} />
      <Section
        title="Meta movers"
        eyebrow="Last 14 days"
        action="Hero meta"
        onPress={() => go("heroRanks")}
      />
      <View style={s.wrap}>
        {d.movers.map(({ h, delta, tr }) => (
          <Pressable
            key={h.id}
            onPress={() => go("hero", { id: h.id })}
            style={[s.card, { width: "48.5%" }]}
          >
            <View style={s.row}>
              <Art hero={h.key} width={28} height={28} />
              <Txt bold size={11}>
                {h.name}
              </Txt>
            </View>
            <Txt color={delta > 0 ? C.win : C.loss}>
              {delta > 0 ? "+" : ""}
              {(delta * 100).toFixed(1)}pp
            </Txt>
            <Spark values={tr} height={48} color={delta > 0 ? C.win : C.loss} />
          </Pressable>
        ))}
      </View>
      <Section title="Tournaments" action="See all" onPress={() => go("pro")} />
      <HomePro kind="leagues" />
      <View style={{ padding: 20 }}>
        <Txt muted size={10}>
          Deterministic sample data based on the original design. Artwork loads
          from public CDNs.
        </Txt>
      </View>
    </View>
  );
}
