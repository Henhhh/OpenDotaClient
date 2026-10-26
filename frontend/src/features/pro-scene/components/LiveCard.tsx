import { useState } from "react";
import { Linking, Pressable, View } from "react-native";
import { getTeam, getLeague } from "@/features/pro-scene/data/pro";
import { getHero } from "@/features/heroes/data/heroes";
import type { LiveMatch } from "@/shared/types/domain";
import { fmtDuration } from "@/shared/utils/format";
import { C, s } from "@/shared/theme/theme";
import { Art } from "@/shared/ui/Art";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Txt } from "@/shared/ui/Txt";
import { go } from "@/shared/navigation/navigation";
import { TeamMark } from "@/features/pro-scene/components/TeamMark";

export function LiveCard({
  m,
  compact = false,
}: {
  m: LiveMatch;
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(!compact);
  const a = getTeam(m.radiant_team_id),
    b = getTeam(m.dire_team_id);
  return (
    <Card>
      <View style={s.between}>
        <Txt muted size={10}>
          {getLeague(m.leagueid).short} · Game {m.game_number}
        </Txt>
        <Txt color={C.loss} bold>
          • LIVE
        </Txt>
      </View>
      <Pressable onPress={() => setExpanded((v) => !v)}>
        <View style={s.between}>
          <TeamMark team={a} />
          <Txt bold>{a.tag}</Txt>
          <View style={{ alignItems: "center" }}>
            <Txt bold size={26}>
              <Txt color={C.win} size={26}>
                {m.radiant_score}
              </Txt>{" "}
              – {m.dire_score}
            </Txt>
            <Txt color={C.gold}>{fmtDuration(m.game_time)}</Txt>
          </View>
          <Txt bold>{b.tag}</Txt>
          <TeamMark team={b} />
        </View>
        <View
          style={{
            height: 5,
            backgroundColor: "#934d38",
            borderRadius: 4,
            marginVertical: 14,
          }}
        >
          <View
            style={{
              height: 5,
              width: `${Math.max(10, Math.min(90, 50 + m.radiant_lead / 300))}%`,
              backgroundColor: "#9cc95a",
              borderRadius: 4,
            }}
          />
        </View>
        <View style={s.between}>
          <Txt muted size={10}>
            {(m.spectators / 1000).toFixed(1)}k watching
          </Txt>
          <Txt muted size={10}>
            Series {m.series_score.join("–")}
          </Txt>
          <Txt color={C.gold}>
            {m.radiant_lead > 0 ? "+" : ""}
            {(m.radiant_lead / 1000).toFixed(1)}k
          </Txt>
        </View>
      </Pressable>
      {expanded && (
        <>
          {[m.radiant_heroes, m.dire_heroes].map((heroes, i) => (
            <View key={i} style={{ gap: 10 }}>
              <Txt bold size={11} color={i ? C.loss : C.win}>
                {i ? "DIRE" : "RADIANT"} · {i ? b.name : a.name}
              </Txt>
              <View style={s.between}>
                {heroes.map((id) => (
                  <Pressable
                    key={id}
                    style={{ width: "18%" }}
                    onPress={() => go("hero", { id })}
                  >
                    <Art hero={getHero(id).key} width={42} height={42} />
                    <Txt muted size={9}>
                      {getHero(id).name}
                    </Txt>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
          <View style={s.row}>
            <Button onPress={() => go("team", { id: a.team_id })}>
              {a.tag}
            </Button>
            <Button onPress={() => go("team", { id: b.team_id })}>
              {b.tag}
            </Button>
            <Button
              primary
              onPress={() =>
                void Linking.openURL("https://www.dota2.com/watch")
              }
            >
              Watch
            </Button>
          </View>
          <Badge text="MOCK PREVIEW" />
        </>
      )}
    </Card>
  );
}
