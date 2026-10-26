import { useState } from "react";
import { View } from "react-native";
import {
  getPlayer,
  PLAYERS,
  ME_ID,
  playerTotals,
} from "@/features/players/data/players";
import { C, s } from "@/shared/theme/theme";
import { Badge } from "@/shared/ui/Badge";
import { Card } from "@/shared/ui/Card";
import { Choices } from "@/shared/ui/Choices";
import { Txt } from "@/shared/ui/Txt";

export function Compare() {
  const [a, setA] = useState(String(ME_ID)),
    [b, setB] = useState(String(PLAYERS[1].account_id));
  const pa = getPlayer(Number(a)),
    pb = getPlayer(Number(b));
  return (
    <View style={{ gap: 12 }}>
      <Txt muted>Select two sample player profiles</Txt>
      <Choices
        items={PLAYERS.map((p) => p.name)}
        value={pa?.name ?? ""}
        onChange={(n) =>
          setA(String(PLAYERS.find((p) => p.name === n)!.account_id))
        }
      />
      <Choices
        items={PLAYERS.map((p) => p.name)}
        value={pb?.name ?? ""}
        onChange={(n) =>
          setB(String(PLAYERS.find((p) => p.name === n)!.account_id))
        }
      />
      {pa && pb && (
        <Card>
          <View style={s.between}>
            <Txt bold>{pa.name}</Txt>
            <Txt muted>vs</Txt>
            <Txt bold>{pb.name}</Txt>
          </View>
          {(["wins", "kills", "deaths", "assists", "gpm", "xpm"] as const).map(
            (k) => (
              <View key={k} style={s.between}>
                <Txt color={C.gold}>
                  {playerTotals(pa.account_id)[k].toLocaleString()}
                </Txt>
                <Txt muted>{k.toUpperCase()}</Txt>
                <Txt color={C.win}>
                  {playerTotals(pb.account_id)[k].toLocaleString()}
                </Txt>
              </View>
            ),
          )}
        </Card>
      )}
      <Badge />
    </View>
  );
}
