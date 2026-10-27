import { useState } from "react";
import { TextInput, View } from "react-native";
import type { PlayerComparison } from "@/shared/api/client";
import { usePlayerApi, validAccount } from "../api/queries";
import { useViewedAccount } from "../components/AccountPicker";
import { ApiState, rate } from "@/shared/ui/ApiState";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Choices } from "@/shared/ui/Choices";
import { Txt } from "@/shared/ui/Txt";
import { C, s } from "@/shared/theme/theme";
export function Compare() {
  const selected = useViewedAccount();
  const [a, setA] = useState(selected),
    [b, setB] = useState(""),
    [ids, setIds] = useState<string[] | null>(null),
    [error, setError] = useState(""),
    [scope, setScope] = useState("All time");
  const q = usePlayerApi<PlayerComparison>(
    "/players/compare",
    {
      account_ids: ids?.join(","),
      scope: scope === "Recent" ? "recent" : "all_time",
    },
    !!ids,
  );
  return (
    <View style={{ gap: 12 }}>
      <Txt muted>Compare two public account IDs</Txt>
      <TextInput
        accessibilityLabel="First account ID"
        value={a}
        onChangeText={setA}
        keyboardType="number-pad"
        style={s.input}
        placeholderTextColor={C.subtle}
      />
      <TextInput
        accessibilityLabel="Second account ID"
        value={b}
        onChangeText={setB}
        keyboardType="number-pad"
        style={s.input}
        placeholder="Second account ID"
        placeholderTextColor={C.subtle}
      />
      <Choices
        segmented
        items={["All time", "Recent"]}
        value={scope}
        onChange={setScope}
      />
      <Button
        primary
        onPress={() => {
          const first = a.trim(),
            second = b.trim();
          if (
            !validAccount(first) ||
            !validAccount(second) ||
            first === second
          ) {
            setError("Enter two different valid account IDs.");
            return;
          }
          setError("");
          setIds([first, second]);
        }}
      >
        Compare players
      </Button>
      {!!error && <Txt color={C.loss}>{error}</Txt>}
      {ids && (
        <ApiState
          pending={q.isPending}
          error={q.error}
          retry={() => void q.refetch()}
        />
      )}
      {!q.error && q.data && (
        <Card>
          <View style={s.between}>
            {q.data.data.players.map((p) => (
              <Txt key={p.profile.account_id} bold>
                {p.profile.name ?? p.profile.account_id}
              </Txt>
            ))}
          </View>
          {(
            [
              "wins",
              "losses",
              "win_rate",
              "kda",
              "avg_kills",
              "avg_deaths",
              "avg_assists",
              "avg_gpm",
              "avg_xpm",
            ] as const
          ).map((k) => (
            <View style={s.between} key={k}>
              <Txt>{k.replaceAll("_", " ").toUpperCase()}</Txt>
              {q.data.data.players.map((p) => (
                <Txt key={p.profile.account_id}>
                  {k === "win_rate"
                    ? rate(p.stats[k])
                    : p.stats[k] == null
                      ? "—"
                      : p.stats[k]!.toFixed(2)}
                </Txt>
              ))}
            </View>
          ))}
        </Card>
      )}
    </View>
  );
}
