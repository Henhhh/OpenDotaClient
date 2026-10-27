import { useState } from "react";
import { Pressable, View } from "react-native";
import {
  useHero,
  useCatalog,
  useMatchups,
  useStats,
  useRankings,
} from "../api/queries";
import { ApiState, RemoteImage, rate, numberText } from "@/shared/ui/ApiState";
import { Txt } from "@/shared/ui/Txt";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Choices } from "@/shared/ui/Choices";
import { Notice } from "@/shared/ui/Notice";
import { C, s } from "@/shared/theme/theme";
import { useFavorite } from "@/shared/state/AppState";
import { go } from "@/shared/navigation/navigation";
import { Build } from "@/features/builds/screens/BuildScreen";
export function HeroDetail({ id }: { id: number }) {
  const [tab, setTab] = useState("Overview");
  const [favorite, toggle, favoriteState] = useFavorite("heroes", id);
  const hero = useHero(id),
    stats = useStats(undefined, tab === "Statistics"),
    matchups = useMatchups(id, tab === "Matchups"),
    catalog = useCatalog(),
    rankings = useRankings(id, tab === "Players");
  if (!Number.isSafeInteger(id) || id <= 0)
    return <Notice>Invalid hero ID.</Notice>;
  if (!hero.data)
    return (
      <ApiState
        pending={hero.isPending}
        error={hero.error}
        retry={() => void hero.refetch()}
      />
    );
  const h = hero.data.data,
    stat = stats.data?.data.find((row) => row.hero_id === h.hero_id);
  return (
    <View style={{ gap: 12 }}>
      <RemoteImage uri={h.image_url} width={280} height={160} />
      <View style={s.between}>
        <Txt bold size={24}>
          {h.name}
        </Txt>
        <Button onPress={toggle}>
          {favorite ? "★ Favorite" : "☆ Favorite"}
        </Button>
      </View>
      <Txt muted>
        {h.primary_attr.toUpperCase()} · {h.attack_type} · {h.roles.join(", ")}
      </Txt>
      {favoriteState.error && <Notice>{favoriteState.error.message}</Notice>}
      <Choices
        items={["Overview", "Statistics", "Matchups", "Builds", "Players"]}
        value={tab}
        onChange={setTab}
      />
      {tab === "Overview" && (
        <>
          <Card>
            <Txt>
              Base health {numberText(h.base_health)} · Base armor{" "}
              {numberText(h.base_armor)} · Speed {numberText(h.move_speed)}
            </Txt>
            <Txt>
              STR {numberText(h.base_str)} +{numberText(h.str_gain)} · AGI{" "}
              {numberText(h.base_agi)} +{numberText(h.agi_gain)} · INT{" "}
              {numberText(h.base_int)} +{numberText(h.int_gain)}
            </Txt>
          </Card>
          <Txt bold>Abilities</Txt>
          {h.abilities?.map((a) => (
            <Card key={a.key}>
              <View style={s.row}>
                <RemoteImage uri={a.image_url} width={44} height={44} />
                <Txt bold>{a.name}</Txt>
              </View>
              <Txt muted>{a.description ?? "Description unavailable"}</Txt>
            </Card>
          )) ?? <Notice>Ability data unavailable.</Notice>}
          <Txt bold>Talents</Txt>
          {h.talents?.map((t) => (
            <Card key={t.level}>
              <Txt bold>Level {t.level}</Txt>
              <Txt>
                {t.left} / {t.right}
              </Txt>
            </Card>
          )) ?? <Notice>Talent data unavailable.</Notice>}
        </>
      )}
      {tab === "Statistics" && (
        <>
          <ApiState
            pending={stats.isPending}
            error={stats.error}
            retry={() => void stats.refetch()}
          />
          <Card>
            <Txt bold>Professional matches</Txt>
            <Txt>
              Win rate {rate(stat?.win_rate)} · Picks {numberText(stat?.picks)}{" "}
              · Bans {numberText(stat?.bans)}
            </Txt>
            <Txt muted>Pick rate unavailable: no verified sample size.</Txt>
          </Card>
        </>
      )}
      {tab === "Matchups" && (
        <>
          <ApiState
            pending={matchups.isPending || catalog.isPending}
            error={matchups.error ?? catalog.error}
            retry={() => {
              void matchups.refetch();
              void catalog.refetch();
            }}
          />
          {matchups.data?.pages
            .flatMap((p) => p.data.items)
            .map((row) => (
              <Pressable
                key={row.against_hero_id}
                onPress={() => go("hero", { id: row.against_hero_id })}
              >
                <Card>
                  <Txt bold>
                    {catalog.data?.data.find(
                      (item) => item.hero_id === row.against_hero_id,
                    )?.name ?? "Hero " + row.against_hero_id}
                  </Txt>
                  <Txt>
                    Win rate {rate(row.win_rate)} · {row.games} games
                  </Txt>
                </Card>
              </Pressable>
            ))}
          {matchups.hasNextPage && (
            <Button
              onPress={() => {
                if (!matchups.isFetchingNextPage) void matchups.fetchNextPage();
              }}
            >
              Load more matchups
            </Button>
          )}
        </>
      )}
      {tab === "Builds" && <Build heroId={id} />}
      {tab === "Players" && (
        <>
          <ApiState
            pending={rankings.isPending}
            error={rankings.error}
            retry={() => void rankings.refetch()}
          />
          <Notice>
            Player profile screens still use sample data until the Players API
            is integrated.
          </Notice>
          {rankings.data?.pages
            .flatMap((p) => p.data.items)
            .map((row) => (
              <Pressable
                key={row.player.account_id}
                onPress={() => go("player", { id: row.player.account_id })}
                style={s.row}
              >
                <RemoteImage
                  uri={row.player.avatar_url}
                  width={40}
                  height={40}
                />
                <View style={{ flex: 1 }}>
                  <Txt bold>
                    {row.position}. {row.player.name ?? row.player.account_id}
                  </Txt>
                </View>
                <Txt color={C.gold}>{row.score.toFixed(0)}</Txt>
              </Pressable>
            ))}
          {rankings.data && !rankings.data.pages[0].data.items.length && (
            <Txt muted>No player rankings found.</Txt>
          )}
        </>
      )}
      <ApiState error={hero.error} retry={() => void hero.refetch()} />
      {tab === "Players" && rankings.hasNextPage && (
        <Button
          onPress={() => {
            if (!rankings.isFetchingNextPage) void rankings.fetchNextPage();
          }}
        >
          Load more players
        </Button>
      )}
      <Txt muted size={10}>
        OpenDota · Updated {hero.data.meta.fetched_at}
      </Txt>
    </View>
  );
}
