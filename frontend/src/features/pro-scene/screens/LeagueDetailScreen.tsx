import { View } from "react-native";
import { PRO_MATCHES, getTeam, getLeague } from "@/features/pro-scene/data/pro";
import { fmtDate } from "@/shared/utils/format";
import { C } from "@/shared/theme/theme";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Section } from "@/shared/ui/Section";
import { Txt } from "@/shared/ui/Txt";
import { go } from "@/shared/navigation/navigation";
import { ProMatchCard } from "@/features/pro-scene/components/ProMatchCard";

export function LeagueDetail({ id }: { id: number }) {
  const l = getLeague(id);
  return (
    <View style={{ gap: 12 }}>
      <Card>
        <Txt bold size={22}>
          {l.name}
        </Txt>
        <Txt>{l.location}</Txt>
        <Txt color={C.gold}>
          {l.prize} · {l.status}
        </Txt>
        <Txt muted>
          {fmtDate(l.start)} – {fmtDate(l.end)}
        </Txt>
      </Card>
      <Section title="Teams" />
      {l.teams.map((id) => (
        <Button key={id} onPress={() => go("team", { id })}>
          {getTeam(id).name}
        </Button>
      ))}
      <Section title="Matches" />
      {PRO_MATCHES.filter((m) => m.leagueid === id).map((m) => (
        <ProMatchCard key={m.match_id} m={m} />
      ))}
    </View>
  );
}
