import { Pressable, View } from "react-native";
import type { League } from "@/shared/types/domain";
import { fmtDate } from "@/shared/utils/format";
import { C, s } from "@/shared/theme/theme";
import { Card } from "@/shared/ui/Card";
import { Txt } from "@/shared/ui/Txt";
import { go } from "@/shared/navigation/navigation";

export function LeagueCard({ league: l }: { league: League }) {
  return (
    <Pressable onPress={() => go("league", { id: l.leagueid })}>
      <Card>
        <View style={s.row}>
          <View
            style={{
              backgroundColor: l.color + "33",
              padding: 12,
              borderRadius: 12,
            }}
          >
            <Txt color={l.color} bold>
              {l.short}
            </Txt>
          </View>
          <View style={{ flex: 1 }}>
            <Txt bold>{l.name}</Txt>
            <Txt muted>
              {fmtDate(l.start)} – {fmtDate(l.end)}
            </Txt>
            <Txt size={11} color={C.gold}>
              {l.status.toUpperCase()} · {l.prize} · {l.tier}
            </Txt>
          </View>
          <Txt muted>›</Txt>
        </View>
      </Card>
    </Pressable>
  );
}
