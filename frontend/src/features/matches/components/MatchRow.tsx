import { Pressable, Text, View } from "react-native";
import { getHero } from "@/features/heroes/data/heroes";
import { isWin } from "@/features/matches/data/matches";
import type { PlayerMatch } from "@/shared/types/domain";
import {
  fmtDuration,
  GAME_MODES,
  LOBBY_TYPES,
  relTime,
} from "@/shared/utils/format";
import { C, s } from "@/shared/theme/theme";
import { Art } from "@/shared/ui/Art";
import { Txt } from "@/shared/ui/Txt";
import { go } from "@/shared/navigation/navigation";

export function MatchRow({ m }: { m: PlayerMatch }) {
  const h = getHero(m.hero_id);
  return (
    <Pressable
      onPress={() => go("match", { id: m.match_id })}
      style={[
        s.card,
        s.row,
        {
          padding: 10,
          marginBottom: 7,
          borderLeftWidth: 3,
          borderLeftColor: isWin(m) ? C.win : C.loss,
        },
      ]}
    >
      <Art hero={h.key} width={66} height={42} />
      <View style={{ flex: 1 }}>
        <Txt bold>{h.name}</Txt>
        <Txt size={10} muted>
          <Text style={{ color: isWin(m) ? C.win : C.loss }}>
            {isWin(m) ? "Win" : "Loss"}
          </Text>{" "}
          · {GAME_MODES[m.game_mode]} · {LOBBY_TYPES[m.lobby_type]}
        </Txt>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Txt bold>
          {m.kills}/<Text style={{ color: C.loss }}>{m.deaths}</Text>/
          {m.assists}
        </Txt>
        <Txt muted size={10}>
          {fmtDuration(m.duration)} · {relTime(m.start_time)}
        </Txt>
      </View>
    </Pressable>
  );
}
