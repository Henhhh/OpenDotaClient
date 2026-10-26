import { useState } from "react";
import { Pressable, View } from "react-native";
import { TEAMS, teamRecentResults } from "@/features/pro-scene/data/pro";
import { fmtPct } from "@/shared/utils/format";
import { C, s } from "@/shared/theme/theme";
import { Card } from "@/shared/ui/Card";
import { Choices } from "@/shared/ui/Choices";
import { Txt } from "@/shared/ui/Txt";
import { ResultStrip } from "@/shared/ui/ResultStrip";
import { go } from "@/shared/navigation/navigation";
import { TeamMark } from "@/features/pro-scene/components/TeamMark";

export function TeamList() {
  const [sort, setSort] = useState("Rating"),
    [region, setRegion] = useState("All regions");
  const rows = TEAMS.filter(
    (t) => region === "All regions" || region === t.region,
  ).sort((a, b) =>
    sort === "Win rate"
      ? b.wins / (b.wins + b.losses) - a.wins / (a.wins + a.losses)
      : sort === "Matches"
        ? b.wins + b.losses - a.wins - a.losses
        : b.rating - a.rating,
  );
  return (
    <View style={{ gap: 10 }}>
      <Choices
        segmented
        items={["Rating", "Win rate", "Matches"]}
        value={sort}
        onChange={setSort}
      />
      <Choices
        items={["All regions", ...new Set(TEAMS.map((t) => t.region))]}
        value={region}
        onChange={setRegion}
      />
      {rows.map((t, i) => (
        <Pressable
          key={t.team_id}
          onPress={() => go("team", { id: t.team_id })}
        >
          <Card>
            <View style={s.row}>
              <Txt muted>{i + 1}</Txt>
              <TeamMark team={t} />
              <View style={{ flex: 1 }}>
                <Txt bold>{t.name}</Txt>
                <Txt muted>
                  {t.region} · {t.wins + t.losses} matches
                </Txt>
                <Txt color={C.win}>{fmtPct(t.wins / (t.wins + t.losses))}</Txt>
              </View>
              <Txt color={C.gold} bold>
                {t.rating.toLocaleString()}
              </Txt>
            </View>
            <ResultStrip results={teamRecentResults(t.team_id)} />
          </Card>
        </Pressable>
      ))}
    </View>
  );
}
