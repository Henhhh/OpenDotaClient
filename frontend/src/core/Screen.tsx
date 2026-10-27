import { Brand } from "@/shared/ui/Brand";
import { useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQueryClient, useIsFetching } from "@tanstack/react-query";
import { Home } from "@/features/home/screens/HomeScreen";
import { Matches } from "@/features/matches/screens/MatchesScreen";
import { MatchDetail } from "@/features/matches/screens/MatchDetailScreen";
import { Heroes } from "@/features/heroes/screens/HeroesScreen";
import { HeroDetail } from "@/features/heroes/screens/HeroDetailScreen";
import { HeroRanks } from "@/features/heroes/screens/HeroRanksScreen";
import { Build } from "@/features/builds/screens/BuildScreen";
import { Profile } from "@/features/players/screens/ProfileScreen";
import { Pro } from "@/features/pro-scene/screens/ProScreen";
import { Live } from "@/features/pro-scene/screens/LiveScreen";
import { Rankings } from "@/features/pro-scene/screens/RankingsScreen";
import { TeamDetail } from "@/features/pro-scene/screens/TeamDetailScreen";
import { LeagueDetail } from "@/features/pro-scene/screens/LeagueDetailScreen";
import { Search } from "@/features/search/screens/SearchScreen";
import { Notifications } from "@/features/notifications/screens/NotificationsScreen";
import { Favorites } from "@/features/favorites/screens/FavoritesScreen";
import { Compare } from "@/features/players/screens/CompareScreen";
import { Settings } from "@/features/settings/screens/SettingsScreen";
import { Empty } from "@/shared/ui/Empty";
import { IconButton } from "@/shared/ui/IconButton";
import { Txt } from "@/shared/ui/Txt";
import { C, s } from "@/shared/theme/theme";
import { go } from "@/shared/navigation/navigation";
import { useUnread } from "@/features/account/api";

const TITLES: Record<string, string> = {
  home: "OpenDota",
  matches: "Matches",
  heroes: "Heroes",
  pro: "Pro Scene",
  profile: "Profile",
  match: "Match details",
  hero: "Hero details",
  heroRanks: "Hero stats by rank",
  build: "Build",
  live: "Live matches",
  rankings: "Rankings",
  team: "Team",
  league: "Tournament",
  player: "Player",
  search: "Search",
  notifications: "Notifications",
  favorites: "Favorites",
  compare: "Compare players",
  settings: "Settings",
};

export function Screen({ name }: { name: string }) {
  const queryClient = useQueryClient();
  const liveScreen = [
    "home",
    "profile",
    "player",
    "matches",
    "match",
    "compare",
    "heroes",
    "hero",
    "heroRanks",
    "search",
    "build",
    "pro",
    "team",
    "league",
    "rankings",
    "live",
    "settings",
    "favorites",
    "notifications",
  ].includes(name);
  const part2Fetching = useIsFetching({ queryKey: ["part2"] });
  const part3Fetching = useIsFetching({ queryKey: ["part3"] });
  const accountFetching = useIsFetching({ queryKey: ["account"] });
  const part1Fetching = useIsFetching({ queryKey: ["part1"] });
  const liveFetching =
    part1Fetching + part2Fetching + part3Fetching + accountFetching;
  const [grid, setGrid] = useState(true);
  const params = useLocalSearchParams<{
    id?: string;
    heroId?: string;
    matchId?: string;
    slot?: string;
  }>();
  const id = Number(params.id),
    [filter, setFilter] = useState(false),
    [refreshed, setRefreshed] = useState(false);
  const notifications = useUnread();
  const refresh = () => {
    const accountRefresh = Promise.all([
      queryClient.invalidateQueries({ queryKey: ["part3"] }),
      queryClient.invalidateQueries({ queryKey: ["account"] }),
    ]);
    if (liveScreen) {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["part1"] }),
        accountRefresh,
        queryClient.invalidateQueries({ queryKey: ["part2"] }),
      ]).then(() => setRefreshed(true));
      return;
    }
    void accountRefresh.then(() => setRefreshed(true));
  };
  const root = ["home", "matches", "heroes", "pro", "profile"].includes(name);
  const unread = notifications.error
    ? null
    : (notifications.data?.data.total ?? null);
  let content;
  switch (name) {
    case "home":
      content = <Home />;
      break;
    case "matches":
      content = (
        <Matches filterOpen={filter} onFilterClose={() => setFilter(false)} />
      );
      break;
    case "heroes":
      content = <Heroes grid={grid} />;
      break;
    case "pro":
      content = <Pro />;
      break;
    case "profile":
      content = <Profile refreshing={part1Fetching > 0} onRefresh={refresh} />;
      break;
    case "player":
      content = (
        <Profile
          key={params.id}
          id={params.id ?? ""}
          refreshing={part1Fetching > 0}
          onRefresh={refresh}
        />
      );
      break;
    case "match":
      content = /^[1-9]\d{0,19}$/.test(params.id ?? "") ? (
        <MatchDetail key={params.id} id={params.id!} />
      ) : (
        <Empty text="Invalid match ID" />
      );
      break;
    case "hero":
      content = <HeroDetail id={id} />;
      break;
    case "heroRanks":
      content = <HeroRanks />;
      break;
    case "build":
      content = (
        <Build
          heroId={Number(params.heroId) || 17}
          matchId={params.matchId}
          slot={params.slot ? Number(params.slot) : undefined}
        />
      );
      break;
    case "live":
      content = <Live />;
      break;
    case "rankings":
      content = <Rankings />;
      break;
    case "team":
      content = <TeamDetail id={params.id ?? ""} />;
      break;
    case "league":
      content = <LeagueDetail id={params.id ?? ""} />;
      break;
    case "search":
      content = <Search />;
      break;
    case "notifications":
      content = <Notifications />;
      break;
    case "favorites":
      content = <Favorites />;
      break;
    case "compare":
      content = <Compare />;
      break;
    case "settings":
      content = <Settings />;
      break;
    default:
      content = <Empty text="Screen not found" />;
  }
  return (
    <View testID={`screen-${name}`} style={{ flex: 1, backgroundColor: C.bg }}>
      <View
        style={[
          s.between,
          {
            height: 58,
            paddingHorizontal: 10,
            borderBottomWidth: 1,
            borderBottomColor: C.line,
          },
        ]}
      >
        {!root && (
          <IconButton
            name="back"
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/")
            }
            label="Go back"
          />
        )}
        <View style={{ flex: 1 }}>
          {name === "home" ? (
            <Brand />
          ) : (
            <Txt bold size={20}>
              {TITLES[name]}
            </Txt>
          )}
          {name === "matches" && (
            <Txt muted size={10}>
              Player match history
            </Txt>
          )}
          {name === "heroes" && (
            <Txt muted size={10}>
              OpenDota hero catalog
            </Txt>
          )}
          {name === "pro" && (
            <Txt muted size={10}>
              Teams, tournaments & results
            </Txt>
          )}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {(name === "home" || name === "profile") &&
            (part1Fetching > 0 ? (
              <ActivityIndicator color={C.gold} />
            ) : (
              <IconButton
                name="refresh"
                onPress={refresh}
                label="Refresh data"
              />
            ))}
          {name === "home" && (
            <View>
              <IconButton
                name="bell"
                onPress={() => go("notifications")}
                label={
                  unread == null
                    ? "Notifications"
                    : `${unread} unread notifications`
                }
              />
              {unread != null && unread > 0 && (
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    right: 3,
                    top: 0,
                    backgroundColor: C.red,
                    borderRadius: 10,
                    paddingHorizontal: 4,
                  }}
                >
                  <Txt size={9}>{unread}</Txt>
                </View>
              )}
            </View>
          )}
          {name === "profile" && (
            <IconButton name="settings" onPress={() => go("settings")} />
          )}
          {name === "matches" && (
            <IconButton name="filter" onPress={() => setFilter(true)} />
          )}
          {name === "pro" && (
            <>
              <IconButton name="live" onPress={() => go("live")} />
              <IconButton
                name="pro"
                label="Rankings"
                onPress={() => go("rankings")}
              />
            </>
          )}
          {name === "heroes" && (
            <>
              <IconButton
                name="chart"
                label="Hero stats by rank"
                onPress={() => go("heroRanks")}
              />
              <IconButton
                name={grid ? "list" : "grid"}
                label={grid ? "View as list" : "View as grid"}
                onPress={() => setGrid((g) => !g)}
              />
            </>
          )}
          {name !== "search" && name !== "heroes" && (
            <IconButton name="search" onPress={() => go("search")} />
          )}
        </View>
      </View>
      {name === "profile" || name === "player" ? (
        content
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={liveFetching > 0}
              onRefresh={refresh}
              tintColor={C.red}
            />
          }
          contentContainerStyle={{ padding: 14, paddingBottom: 30 }}
        >
          {refreshed && (
            <Txt muted size={10}>
              API data refreshed
            </Txt>
          )}
          {content}
        </ScrollView>
      )}
    </View>
  );
}
