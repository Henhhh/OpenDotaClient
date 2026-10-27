import { Pressable, ScrollView, View } from "react-native";
import type { Page, PlayerMatch } from "@/shared/api/client";
import { usePlayerApi } from "@/features/players/api/queries";
import {
  AccountPicker,
  useViewedAccount,
} from "@/features/players/components/AccountPicker";
import { ProfileHeader } from "@/features/players/components/ProfileHeader";
import { RecentForm } from "@/features/players/components/RecentForm";
import { Performance } from "@/features/players/components/Performance";
import { PlayerHeroList } from "@/features/players/components/PlayerHeroList";
import { MatchRow } from "@/features/matches/components/MatchRow";
import { HomePro } from "@/features/pro-scene/components/HomePro";
import { heroPresentation } from "@/features/heroes/data/presentation";
import { useAppState } from "@/shared/state/AppState";
import { ApiState } from "@/shared/ui/ApiState";
import { Art } from "@/shared/ui/Art";
import { Button } from "@/shared/ui/Button";
import { Icon } from "@/shared/ui/Icon";
import { Notice } from "@/shared/ui/Notice";
import { Section } from "@/shared/ui/Section";
import { Txt } from "@/shared/ui/Txt";
import { go } from "@/shared/navigation/navigation";
import { C, s } from "@/shared/theme/theme";
export function Home() {
  const id = useViewedAccount(),
    { state } = useAppState();
  const recent = usePlayerApi<Page<PlayerMatch>>(`/players/${id}/matches`, {
    limit: 3,
  });
  return (
    <View style={{ gap: 12 }}>
      <Txt muted>Good evening,</Txt>
      <AccountPicker />
      <Pressable
        onPress={() => go("search")}
        style={[s.input, s.row, { flex: undefined }]}
      >
        <Icon name="search" size={18} />
        <Txt muted>Search players, heroes, teams or match IDs</Txt>
      </Pressable>
      <ProfileHeader id={id} />
      <RecentForm id={id} />
      <Button onPress={() => go("profile")}>View profile</Button>
      <View style={s.wrap}>
        {[
          ["Match History", "matches", "matches"],
          ["Hero Stats", "heroes", "heroes"],
          ["Builds", "build", "build"],
          ["Pro Scene", "pro", "pro"],
        ].map(([label, icon, route]) => (
          <Pressable
            key={route}
            onPress={() => go(route, route === "build" ? { heroId: 17 } : {})}
            style={[s.card, s.row, { width: "48%", padding: 12 }]}
          >
            <Icon name={icon} color={C.gold} />
            <Txt bold>{label}</Txt>
          </Pressable>
        ))}
      </View>
      <Section
        title="Performance overview"
        eyebrow="Up to 20 latest matches"
        action="Stats"
        onPress={() => go("profile")}
      />
      <Performance id={id} />
      <Section
        title="Live matches"
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
              { width: "31%", alignItems: "center", paddingVertical: 20 },
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
        title="Recent matches"
        action="See all"
        onPress={() => go("matches")}
      />
      <ApiState
        pending={recent.isPending}
        error={recent.error}
        retry={() => void recent.refetch()}
      />
      {recent.data && !recent.error && !recent.data.data.items.length && (
        <Txt muted>No recent matches.</Txt>
      )}
      {recent.data?.data.items.map((m) => (
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
        {state.heroes.map((hero) => (
          <Pressable
            key={hero}
            onPress={() => go("hero", { id: hero })}
            style={[s.card, { width: 105, padding: 0, overflow: "hidden" }]}
          >
            <Art
              hero={heroPresentation(String(hero)).key}
              width={105}
              height={65}
            />
            <Txt bold size={11}>
              {heroPresentation(String(hero)).name}
            </Txt>
          </Pressable>
        ))}
      </ScrollView>
      <Section
        title="Most played heroes"
        action="See all"
        onPress={() => go("profile")}
      />
      <PlayerHeroList id={id} limit={5} />
      <Section
        title="Hero meta"
        action="See all"
        onPress={() => go("heroRanks")}
      />
      <Notice>
        Historical meta changes are unavailable. Open Hero meta for current
        statistics.
      </Notice>
      <Section title="Tournaments" action="See all" onPress={() => go("pro")} />
      <HomePro kind="leagues" />
      <Txt muted size={10}>
        Player and match data from the backend API. Missing statistics are shown
        as —.
      </Txt>
    </View>
  );
}
