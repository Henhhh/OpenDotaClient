import { Pressable, View } from "react-native";
import { ME_ID, playerHeroes } from "@/features/players/data/players";
import { getHero } from "@/features/heroes/data/heroes";
import { fmtPct, fmtNum } from "@/shared/utils/format";
import { Art } from "@/shared/ui/Art";
import { Card } from "@/shared/ui/Card";
import { Txt } from "@/shared/ui/Txt";
import { C, s } from "@/shared/theme/theme";
import { go } from "@/shared/navigation/navigation";

export function PlayerHeroList({
  id = ME_ID,
  limit = 30,
  sort = "Most played",
}: {
  id?: number;
  limit?: number;
  sort?: string;
}) {
  const rows = [...playerHeroes(id)].sort((a, b) =>
    sort === "Win rate"
      ? b.win / b.games - a.win / a.games
      : sort === "Recent"
        ? b.last_played - a.last_played
        : b.games - a.games,
  );
  const max = Math.max(...rows.map((r) => r.games));
  return (
    <Card>
      {rows.slice(0, limit).map((r) => (
        <Pressable
          key={r.hero_id}
          onPress={() => go("hero", { id: r.hero_id })}
          style={[s.row, { paddingVertical: 7 }]}
        >
          <Art hero={getHero(r.hero_id).key} width={34} height={34} />
          <View style={{ flex: 1, gap: 6 }}>
            <View style={s.between}>
              <Txt bold>{getHero(r.hero_id).name}</Txt>
              <Txt color={C.win} bold>
                {fmtPct(r.win / r.games)}
              </Txt>
            </View>
            <View
              style={{ height: 4, backgroundColor: C.line, borderRadius: 4 }}
            >
              <View
                style={{
                  height: 4,
                  width: `${(r.games / max) * 100}%`,
                  backgroundColor: C.gold,
                  borderRadius: 4,
                }}
              />
            </View>
            <View style={s.between}>
              <Txt muted size={10}>
                KDA {r.kda.toFixed(2)} · {r.gpm} GPM
              </Txt>
              <Txt muted size={10}>
                {fmtNum(r.games)} games
              </Txt>
            </View>
          </View>
        </Pressable>
      ))}
    </Card>
  );
}
