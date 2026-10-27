import { Pressable, View } from "react-native";
import type { PlayerHero } from "@/shared/api/client";
import { usePlayerPages, validAccount } from "../api/queries";
import { ApiState, rate } from "@/shared/ui/ApiState";
import { heroPresentation } from "@/features/heroes/data/presentation";
import { Art } from "@/shared/ui/Art";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Txt } from "@/shared/ui/Txt";
import { s, C } from "@/shared/theme/theme";
import { go } from "@/shared/navigation/navigation";
export function PlayerHeroList({
  id,
  limit,
  sort = "Most played",
}: {
  id: string;
  limit?: number;
  sort?: string;
}) {
  const q = usePlayerPages<PlayerHero>(
    `/players/${id}/heroes`,
    { sort: sort === "Win rate" ? "win_rate" : "games", limit: limit ?? 20 },
    validAccount(id),
  );
  const rows = q.data?.pages.flatMap((p) => p.data.items) ?? [],
    max = Math.max(1, ...rows.map((r) => r.games));
  return (
    <Card>
      <ApiState
        pending={q.isPending}
        error={q.error}
        retry={() => void q.refetch()}
      />
      {q.data && !rows.length && <Txt muted>No heroes played.</Txt>}
      {rows.slice(0, limit).map((r) => (
        <Pressable
          key={r.hero_id}
          onPress={() => go("hero", { id: r.hero_id })}
          style={s.row}
        >
          <Art hero={heroPresentation(r.hero_id).key} width={34} height={34} />
          <View style={{ flex: 1, gap: 6 }}>
            <View style={s.between}>
              <Txt bold>{heroPresentation(r.hero_id).name}</Txt>
              <Txt color={C.win}>{rate(r.win_rate)}</Txt>
            </View>
            <View style={{ height: 4, backgroundColor: C.line }}>
              <View
                style={{
                  height: 4,
                  width: `${(r.games / max) * 100}%`,
                  backgroundColor: C.gold,
                }}
              />
            </View>
            <Txt muted>
              {r.games} games · {r.wins}W / {r.losses}L
            </Txt>
          </View>
        </Pressable>
      ))}
      {!limit && q.hasNextPage && (
        <Button
          onPress={() => {
            if (!q.isFetchingNextPage) void q.fetchNextPage();
          }}
        >
          {q.isFetchingNextPage ? "Loading…" : "Load more heroes"}
        </Button>
      )}
    </Card>
  );
}
