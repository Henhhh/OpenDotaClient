import { useState } from "react";
import type { Page, PlayerMatch } from "@/shared/api/client";
import { usePlayerApi, validAccount } from "../api/queries";
import { ApiState } from "@/shared/ui/ApiState";
import { Card } from "@/shared/ui/Card";
import { Choices } from "@/shared/ui/Choices";
import { Spark } from "@/shared/ui/Spark";
import { Txt } from "@/shared/ui/Txt";
export function Performance({ id }: { id: string }) {
  const [metric, setMetric] = useState("KDA");
  const q = usePlayerApi<Page<PlayerMatch>>(
    `/players/${id}/matches`,
    { limit: 20 },
    validAccount(id),
  );
  const rows = [...(q.data?.data.items ?? [])].reverse();
  const values = rows.map((m) =>
    metric === "GPM"
      ? m.gold_per_min
      : metric === "XPM"
        ? m.xp_per_min
        : (m.kills + m.assists) / Math.max(1, m.deaths),
  );
  const complete = values.length > 0 && values.every((v) => v !== null);
  return (
    <Card>
      <Choices
        segmented
        items={["KDA", "GPM", "XPM"]}
        value={metric}
        onChange={setMetric}
      />
      <ApiState
        pending={q.isPending}
        error={q.error}
        retry={() => void q.refetch()}
      />
      {!q.error &&
        q.data &&
        (complete ? (
          <Spark
            key={`${id}:${metric}:${values.length}`}
            values={values as number[]}
          />
        ) : (
          <Txt muted>
            {values.length
              ? "This metric is unavailable for part of the loaded history."
              : "No recent matches."}
          </Txt>
        ))}
      <Txt muted size={10}>
        Up to 20 latest matches · {metric}
      </Txt>
    </Card>
  );
}
