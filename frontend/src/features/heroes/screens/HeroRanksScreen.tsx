import { useState } from "react";
import { Pressable, View } from "react-native";
import { useCatalog, useStats } from "../api/queries";
import { ApiState, RemoteImage, rate } from "@/shared/ui/ApiState";
import { Choices } from "@/shared/ui/Choices";
import { Txt } from "@/shared/ui/Txt";
import { Notice } from "@/shared/ui/Notice";
import { C, s } from "@/shared/theme/theme";
import { go } from "@/shared/navigation/navigation";
export function HeroRanks() {
  const ranks = [
    "Herald",
    "Guardian",
    "Crusader",
    "Archon",
    "Legend",
    "Ancient",
    "Divine",
    "Immortal",
  ];
  const [rank, setRank] = useState("Divine"),
    [metric, setMetric] = useState("Win rate");
  const catalog = useCatalog(),
    stats = useStats(
      ranks.indexOf(rank) + 1,
      true,
      metric === "Win rate" ? "win_rate" : "picks",
    );
  return (
    <View style={{ gap: 12 }}>
      <Choices items={ranks} value={rank} onChange={setRank} />
      <Choices
        items={["Win rate", "Pick count"]}
        value={metric}
        onChange={setMetric}
      />
      <Notice>
        OpenDota bracket statistics. Pick rate and tier lists are unavailable
        without a verified sample size.
      </Notice>
      <ApiState
        pending={stats.isPending || catalog.isPending}
        error={stats.error ?? catalog.error}
        retry={() => {
          void stats.refetch();
          void catalog.refetch();
        }}
      />
      <Txt muted>HERO · WIN RATE · PICKS</Txt>
      {!catalog.error &&
        stats.data?.data.map((row) => {
          const h = catalog.data?.data.find((h) => h.hero_id === row.hero_id);
          return (
            <Pressable
              key={row.hero_id}
              onPress={() => go("hero", { id: row.hero_id })}
              style={[s.row, s.divider]}
            >
              <RemoteImage uri={h?.icon_url ?? null} width={32} height={32} />
              <View style={{ flex: 1 }}>
                <Txt bold>{h?.name ?? "Hero " + row.hero_id}</Txt>
              </View>
              <Txt color={C.win}>{rate(row.win_rate)}</Txt>
              <Txt muted>{row.picks}</Txt>
            </Pressable>
          );
        })}
      {stats.data && !stats.data.data.length && (
        <Txt muted>No statistics for this bracket.</Txt>
      )}
    </View>
  );
}
