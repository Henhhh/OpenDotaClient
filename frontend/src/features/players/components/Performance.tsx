import { useState } from "react";
import { ME_ID } from "@/features/players/data/players";
import { playerMatches } from "@/features/matches/data/matches";
import { kdaRatio } from "@/shared/utils/format";
import { Card } from "@/shared/ui/Card";
import { Choices } from "@/shared/ui/Choices";
import { Spark } from "@/shared/ui/Spark";
import { Txt } from "@/shared/ui/Txt";
import { C } from "@/shared/theme/theme";

export function Performance({ id = ME_ID }: { id?: number }) {
  const [metric, setMetric] = useState("GPM");
  const rows = [...playerMatches(id).slice(0, 20)].reverse(),
    values = rows.map((m) =>
      metric === "GPM"
        ? m.gold_per_min
        : metric === "XPM"
          ? m.xp_per_min
          : metric === "Damage"
            ? m.hero_damage
            : kdaRatio(m.kills, m.deaths, m.assists),
    );
  return (
    <Card>
      <Choices
        segmented
        items={["GPM", "XPM", "KDA", "Damage"]}
        value={metric}
        onChange={setMetric}
      />
      <Txt bold size={24}>
        {(values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)}
      </Txt>
      <Spark values={values} color={metric === "KDA" ? C.red : C.gold} />
      <Txt muted size={10}>
        Last 20 matches · Tap the chart to inspect
      </Txt>
    </Card>
  );
}
