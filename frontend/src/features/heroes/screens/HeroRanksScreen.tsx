import { useState } from "react";
import { Pressable, View } from "react-native";
import { HEROES, heroStats } from "@/features/heroes/data/heroes";
import { RANK_NAMES } from "@/shared/utils/assets";
import { fmtPct } from "@/shared/utils/format";
import { C, s } from "@/shared/theme/theme";
import { Art } from "@/shared/ui/Art";
import { Badge } from "@/shared/ui/Badge";
import { Card } from "@/shared/ui/Card";
import { Choices } from "@/shared/ui/Choices";
import { Notice } from "@/shared/ui/Notice";
import { Txt } from "@/shared/ui/Txt";
import { go } from "@/shared/navigation/navigation";

export function HeroRanks() {
  const [rank, setRank] = useState("Divine"),
    [metric, setMetric] = useState("Win rate"),
    [view, setView] = useState("Tier list");
  const tier = RANK_NAMES.indexOf(rank);
  const rows = HEROES.map((h) => {
    const b = heroStats(h.id).byRank[tier - 1];
    return { h, wr: b.wins / Math.max(1, b.picks), picks: b.picks };
  });
  const total = rows.reduce((sum, r) => sum + r.picks, 0);
  rows.sort((a, b) =>
    metric === "Win rate" ? b.wr - a.wr : b.picks - a.picks,
  );
  return (
    <View style={{ gap: 12 }}>
      <Choices items={RANK_NAMES.slice(1)} value={rank} onChange={setRank} />
      <Choices
        segmented
        items={["Win rate", "Pick rate"]}
        value={metric}
        onChange={setMetric}
      />
      <Choices
        items={["Tier list", "Ranked table"]}
        value={view}
        onChange={setView}
      />
      <Badge text="PLACEHOLDER MODEL" />
      <Notice>{rank} bracket statistics use a sample model.</Notice>
      {view === "Ranked table" ? (
        <Card>
          <View style={s.between}>
            <Txt muted># HERO</Txt>
            <Txt muted>WIN PICK</Txt>
          </View>
          {rows.map((r, i) => (
            <Pressable
              key={r.h.id}
              onPress={() => go("hero", { id: r.h.id })}
              style={[s.row, s.divider]}
            >
              <Txt muted>{i + 1}</Txt>
              <Art hero={r.h.key} width={30} height={30} />
              <View style={{ flex: 1 }}>
                <Txt bold>{r.h.name}</Txt>
              </View>
              <Txt color={C.win}>{fmtPct(r.wr)}</Txt>
              <Txt muted>{fmtPct(r.picks / total)}</Txt>
            </Pressable>
          ))}
        </Card>
      ) : (
        ["S", "A", "B", "C", "D"].map((label, i) => {
          const end = [0.06, 0.2, 0.45, 0.75, 1],
            start = i ? end[i - 1] : 0;
          return (
            <Card key={label}>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View
                  style={{
                    width: 38,
                    backgroundColor: [
                      C.red,
                      C.gold,
                      C.win,
                      "#36a9d6",
                      C.subtle,
                    ][i],
                    borderRadius: 10,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Txt bold size={22}>
                    {label}
                  </Txt>
                </View>
                <View style={[s.wrap, { flex: 1 }]}>
                  {rows
                    .slice(
                      Math.floor(start * rows.length),
                      Math.floor(end[i] * rows.length),
                    )
                    .map((r) => (
                      <Pressable
                        accessibilityLabel={r.h.name}
                        key={r.h.id}
                        onPress={() => go("hero", { id: r.h.id })}
                      >
                        <Art hero={r.h.key} width={34} height={34} />
                      </Pressable>
                    ))}
                </View>
              </View>
            </Card>
          );
        })
      )}
    </View>
  );
}
