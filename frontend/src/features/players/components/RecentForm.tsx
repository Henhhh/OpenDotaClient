import { View } from "react-native";
import { ME_ID } from "@/features/players/data/players";
import { playerMatches, isWin } from "@/features/matches/data/matches";
import { fmtDuration } from "@/shared/utils/format";
import { Card } from "@/shared/ui/Card";
import { Ring } from "@/shared/ui/Ring";
import { Txt } from "@/shared/ui/Txt";
import { C, s } from "@/shared/theme/theme";
import { ResultStrip } from "@/shared/ui/ResultStrip";

export function RecentForm({ id = ME_ID }: { id?: number }) {
  const rows = playerMatches(id).slice(0, 20),
    wins = rows.filter(isWin).length;
  const avg = (fn: (m: (typeof rows)[number]) => number) =>
    rows.reduce((s, m) => s + fn(m), 0) / rows.length;
  return (
    <Card>
      <View style={s.row}>
        <Ring value={wins / rows.length} />
        <View style={{ flex: 1, gap: 10 }}>
          <View style={s.between}>
            <View>
              <Txt muted size={9}>
                AVG K/D/A
              </Txt>
              <Txt bold>
                {avg((m) => m.kills).toFixed(1)}/
                {avg((m) => m.deaths).toFixed(1)}/
                {avg((m) => m.assists).toFixed(1)}
              </Txt>
            </View>
            <View>
              <Txt muted size={9}>
                AVG GPM
              </Txt>
              <Txt color={C.gold} bold>
                {Math.round(avg((m) => m.gold_per_min))}
              </Txt>
            </View>
          </View>
          <View style={s.between}>
            <View>
              <Txt muted size={9}>
                AVG XPM
              </Txt>
              <Txt bold>{Math.round(avg((m) => m.xp_per_min))}</Txt>
            </View>
            <View>
              <Txt muted size={9}>
                AVG LENGTH
              </Txt>
              <Txt bold>{fmtDuration(avg((m) => m.duration))}</Txt>
            </View>
          </View>
        </View>
      </View>
      <ResultStrip results={[...rows].reverse().map(isWin)} />
    </Card>
  );
}
