import { Pressable, View } from "react-native";
import { getTeam, getLeague } from "@/features/pro-scene/data/pro";
import type { ProMatch } from "@/shared/types/domain";
import { fmtDuration, relTime } from "@/shared/utils/format";
import { s } from "@/shared/theme/theme";
import { Card } from "@/shared/ui/Card";
import { Txt } from "@/shared/ui/Txt";
import { go } from "@/shared/navigation/navigation";
import { TeamMark } from "@/features/pro-scene/components/TeamMark";

export function ProMatchCard({ m }: { m: ProMatch }) {
  const a = getTeam(m.radiant_team_id),
    b = getTeam(m.dire_team_id);
  return (
    <Pressable onPress={() => go("match", { id: m.match_id })}>
      <Card>
        <Txt muted size={10}>
          {getLeague(m.leagueid).name} · {m.stage}
        </Txt>
        <View style={s.between}>
          <TeamMark team={a} />
          <Txt bold>{a.tag}</Txt>
          <View style={{ alignItems: "center" }}>
            <Txt bold size={24}>
              {m.series_score.join(" : ")}
            </Txt>
            <Txt muted size={10}>
              {m.series_type} · {fmtDuration(m.duration)}
            </Txt>
          </View>
          <Txt bold>{b.tag}</Txt>
          <TeamMark team={b} />
        </View>
        <Txt muted size={10}>
          {relTime(m.start_time)}
        </Txt>
      </Card>
    </Pressable>
  );
}
