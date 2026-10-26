import { Brand } from "@/shared/ui/Brand";
import { useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { loadCatalog } from "@/core/catalog";
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
import { Button } from "@/shared/ui/Button";
import { Empty } from "@/shared/ui/Empty";
import { IconButton } from "@/shared/ui/IconButton";
import { Txt } from "@/shared/ui/Txt";
import { C, s } from "@/shared/theme/theme";
import { go } from "@/shared/navigation/navigation";
import { useAppState } from "@/shared/state/AppState";
import { NOTIFICATIONS } from "@/features/notifications/data/notifications";

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
  const { state } = useAppState();
  const query = useQuery({
    queryKey: ["catalog"],
    queryFn: loadCatalog,
    staleTime: 60_000,
  });
  const refresh = () => {
    void query.refetch().then(() => setRefreshed(true));
  };
  const root = ["home", "matches", "heroes", "pro", "profile"].includes(name);
  const unread = NOTIFICATIONS.filter((n) => !state.read.includes(n.id)).length;
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
      content = <Profile refreshing={query.isFetching} onRefresh={refresh} />;
      break;
    case "player":
      content = (
        <Profile id={id} refreshing={query.isFetching} onRefresh={refresh} />
      );
      break;
    case "match":
      content =
        Number.isSafeInteger(id) && id > 0 ? (
          <MatchDetail id={id} />
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
          matchId={params.matchId ? Number(params.matchId) : undefined}
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
      content = <TeamDetail id={id} />;
      break;
    case "league":
      content = <LeagueDetail id={id} />;
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
    <View style={{ flex: 1, backgroundColor: C.bg }}>
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
              Kaito · 48 recent matches
            </Txt>
          )}
          {name === "heroes" && (
            <Txt muted size={10}>
              127 heroes · sample meta stats
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
            (query.isFetching ? (
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
                label={`${unread} unread notifications`}
              />
              {unread > 0 && (
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
      {query.isError ? (
        <View style={{ padding: 24 }}>
          <Txt>Could not load data.</Txt>
          <Button onPress={refresh}>Retry</Button>
        </View>
      ) : query.isPending ? (
        <ActivityIndicator color={C.red} style={{ marginTop: 40 }} />
      ) : name === "profile" || name === "player" ? (
        content
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={query.isFetching}
              onRefresh={refresh}
              tintColor={C.red}
            />
          }
          contentContainerStyle={{ padding: 14, paddingBottom: 30 }}
        >
          {refreshed && (
            <Txt muted size={10}>
              Sample data refreshed ·{" "}
              {new Date(query.data.refreshedAt).toLocaleTimeString()}
            </Txt>
          )}
          {content}
        </ScrollView>
      )}
    </View>
  );
}
