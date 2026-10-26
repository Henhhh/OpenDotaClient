import { useState } from "react";
import { Pressable, View } from "react-native";
import { leaderboard, REGIONS } from "@/features/pro-scene/data/pro";
import { C, s } from "@/shared/theme/theme";
import { Card } from "@/shared/ui/Card";
import { Choices } from "@/shared/ui/Choices";
import { Notice } from "@/shared/ui/Notice";
import { Txt } from "@/shared/ui/Txt";
import { HeroRanks } from "@/features/heroes/screens/HeroRanksScreen";
import { go } from "@/shared/navigation/navigation";
import { TeamList } from "@/features/pro-scene/components/TeamList";

export function Rankings() {
  const [tab, setTab] = useState("Players"),
    [region, setRegion] = useState("Europe");
  return (
    <View style={{ gap: 12 }}>
      <Choices
        segmented
        items={["Players", "Teams", "Heroes"]}
        value={tab}
        onChange={setTab}
      />
      {tab === "Teams" ? (
        <TeamList />
      ) : tab === "Heroes" ? (
        <HeroRanks />
      ) : (
        <>
          <Choices
            items={REGIONS.map((r) => r.label)}
            value={region}
            onChange={setRegion}
          />
          <Notice>
            Sample regional leaderboard, not live. Arrows show the change since
            the previous sample.
          </Notice>
          <Card>
            {leaderboard(REGIONS.find((r) => r.label === region)!.id).map(
              (p) => (
                <Pressable
                  key={p.rank}
                  disabled={!p.accountId}
                  onPress={() =>
                    p.accountId && go("player", { id: p.accountId })
                  }
                  style={[s.row, s.divider]}
                >
                  <Txt bold color={p.rank < 4 ? C.gold : C.muted}>
                    {p.rank}
                  </Txt>
                  <Txt size={10} color={p.delta >= 0 ? C.win : C.loss}>
                    {p.delta >= 0 ? "↑" : "↓"}
                    {Math.abs(p.delta)}
                  </Txt>
                  <View style={{ flex: 1 }}>
                    <Txt bold>
                      {p.team && <Txt color={C.gold}>{p.team} </Txt>}
                      {p.name}
                    </Txt>
                    <Txt muted>{p.country}</Txt>
                  </View>
                  {p.accountId && (
                    <Txt color="#36a9d6" size={10}>
                      PRO
                    </Txt>
                  )}
                </Pressable>
              ),
            )}
          </Card>
        </>
      )}
    </View>
  );
}
