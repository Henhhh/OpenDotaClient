import { useState } from "react";
import { View } from "react-native";
import {
  useHero,
  useItems,
  usePopularity,
} from "@/features/heroes/api/queries";
import { ApiState, RemoteImage, numberText } from "@/shared/ui/ApiState";
import { Txt } from "@/shared/ui/Txt";
import { Card } from "@/shared/ui/Card";
import { Choices } from "@/shared/ui/Choices";
import { Notice } from "@/shared/ui/Notice";
import { s } from "@/shared/theme/theme";
import { usePlayerApi, validId } from "@/features/players/api/queries";
import type { MatchDetail } from "@/shared/api/client";
import { MatchInventory } from "@/features/matches/components/MatchInventory";
export function Build({
  heroId,
  matchId,
  slot,
}: {
  heroId: number;
  matchId?: string;
  slot?: number;
}) {
  const [tab, setTab] = useState("Items");
  const match = usePlayerApi<MatchDetail>(
    `/matches/${matchId}`,
    {},
    !!matchId && validId(matchId),
  );
  const player = match.data?.data.players.find((p) => p.player_slot === slot);
  const hero = useHero(heroId),
    popularity = usePopularity(heroId, tab === "Items"),
    items = useItems(tab === "Items");
  return (
    <View style={{ gap: 12 }}>
      <Txt bold size={20}>
        {hero.data?.data.name ?? "Hero"} build
      </Txt>
      {matchId && (
        <>
          <Txt muted>
            Match {matchId} · slot {slot ?? "—"}
          </Txt>
          <ApiState
            pending={match.isPending && match.fetchStatus !== "idle"}
            error={match.error}
            retry={() => void match.refetch()}
          />
          {player ? (
            <MatchInventory player={player} />
          ) : match.data ? (
            <Notice>Player slot not found in this match.</Notice>
          ) : null}
        </>
      )}
      <Choices
        items={["Items", "Skills & talents"]}
        value={tab}
        onChange={setTab}
      />
      <ApiState
        pending={hero.isPending}
        error={hero.error}
        retry={() => void hero.refetch()}
      />
      {tab === "Items" ? (
        <>
          <Notice>
            Item counts from professional matches. Popularity does not represent
            a recommended build or item win rate.
          </Notice>
          <ApiState
            pending={popularity.isPending || items.isPending}
            error={popularity.error ?? items.error}
            retry={() => {
              void popularity.refetch();
              void items.refetch();
            }}
          />
          {!items.error &&
            popularity.data?.data.phases.map((phase) => (
              <Card key={phase.phase}>
                <Txt bold>{phase.phase.toUpperCase()}</Txt>
                {phase.items.length ? (
                  phase.items.map((row) => {
                    const item = items.data?.data.find(
                      (i) => i.item_id === row.item_id,
                    );
                    return (
                      <View key={row.item_id} style={s.row}>
                        <RemoteImage uri={item?.image_url ?? null} />
                        <View style={{ flex: 1 }}>
                          <Txt bold>{item?.name ?? "Item " + row.item_id}</Txt>
                          <Txt muted>
                            Cost {numberText(item?.cost)} · {row.count}{" "}
                            purchases
                          </Txt>
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <Txt muted>No item data for this phase.</Txt>
                )}
              </Card>
            ))}
        </>
      ) : (
        <>
          <Notice>
            Optimal skill order is not available in API v1. Showing hero
            abilities and talents.
          </Notice>
          {hero.data?.data.abilities?.map((a) => (
            <Card key={a.key}>
              <Txt bold>{a.name}</Txt>
              <Txt muted>{a.description ?? "Description unavailable"}</Txt>
            </Card>
          ))}
          {hero.data && !hero.data.data.abilities && (
            <Txt muted>Ability data unavailable.</Txt>
          )}
          {hero.data?.data.talents?.map((t) => (
            <Card key={t.level}>
              <Txt bold>Level {t.level}</Txt>
              <Txt>
                {t.left} / {t.right}
              </Txt>
            </Card>
          ))}
          {hero.data && !hero.data.data.talents && (
            <Txt muted>Talent data unavailable.</Txt>
          )}
        </>
      )}
    </View>
  );
}
