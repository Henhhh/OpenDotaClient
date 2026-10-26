import { View } from "react-native";
import {
  PRO_MATCHES,
  getTeam,
  teamRecentResults,
} from "@/features/pro-scene/data/pro";
import { PRO_PLAYERS } from "@/features/players/data/players";
import { C, s } from "@/shared/theme/theme";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { IconButton } from "@/shared/ui/IconButton";
import { Section } from "@/shared/ui/Section";
import { Txt } from "@/shared/ui/Txt";
import { ResultStrip } from "@/shared/ui/ResultStrip";
import { go } from "@/shared/navigation/navigation";
import { useFavorite } from "@/shared/state/AppState";
import { TeamMark } from "@/features/pro-scene/components/TeamMark";
import { ProMatchCard } from "@/features/pro-scene/components/ProMatchCard";

export function TeamDetail({ id }: { id: number }) {
  const t = getTeam(id);
  const [fav, toggle] = useFavorite("teams", id);
  return (
    <View style={{ gap: 12 }}>
      <Card>
        <View style={s.row}>
          <TeamMark team={t} />
          <View style={{ flex: 1 }}>
            <Txt bold size={22}>
              {t.name}
            </Txt>
            <Txt muted>
              {t.region} · Rating {t.rating}
            </Txt>
          </View>
          <IconButton
            name="star"
            color={fav ? C.gold : C.muted}
            onPress={toggle}
          />
        </View>
        <ResultStrip results={teamRecentResults(id)} />
      </Card>
      <Section title="Active roster" />
      {PRO_PLAYERS.filter((p) => p.pro?.teamId === id).map((p) => (
        <Button
          key={p.account_id}
          onPress={() => go("player", { id: p.account_id })}
        >
          {p.name} · {p.pro?.role}
        </Button>
      ))}
      <Section title="Recent matches" />
      {PRO_MATCHES.filter(
        (m) => m.radiant_team_id === id || m.dire_team_id === id,
      ).map((m) => (
        <ProMatchCard key={m.match_id} m={m} />
      ))}
    </View>
  );
}
