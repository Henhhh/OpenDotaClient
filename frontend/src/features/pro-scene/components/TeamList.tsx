import { useState } from "react";
import { View, TextInput } from "react-native";
import type { Team } from "@/shared/api/client";
import { Choices } from "@/shared/ui/Choices";
import { C, s } from "@/shared/theme/theme";
import { useProList } from "../api/queries";
import { TeamCard, PagedState } from "./ApiCards";
export function TeamList() {
  const [sort, setSort] = useState("Rating"),
    [q, setQ] = useState("");
  const query = useProList<Team>("/pro/teams", {
    q: q.trim() || undefined,
    sort:
      sort === "Win rate"
        ? "win_rate"
        : sort === "Matches"
          ? "matches"
          : "rating",
  });
  return (
    <View style={{ gap: 12 }}>
      <Choices
        segmented
        items={["Rating", "Win rate", "Matches"]}
        value={sort}
        onChange={setSort}
      />
      <TextInput
        accessibilityLabel="Search teams"
        value={q}
        onChangeText={setQ}
        style={[s.input, { flex: undefined }]}
        placeholder="Search teams"
        placeholderTextColor={C.subtle}
      />
      {query.data?.pages
        .flatMap((p) => p.data.items)
        .map((t) => (
          <TeamCard key={t.team_id} team={t} />
        ))}
      <PagedState
        query={query}
        empty={!query.data?.pages[0].data.items.length}
      />
    </View>
  );
}
