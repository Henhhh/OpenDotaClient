import { useState } from "react";
import { View, TextInput } from "react-native";
import type { MatchSummary, ProPlayer, League } from "@/shared/api/client";
import { Choices } from "@/shared/ui/Choices";
import { Notice } from "@/shared/ui/Notice";
import { Button } from "@/shared/ui/Button";
import { C, s } from "@/shared/theme/theme";
import { go } from "@/shared/navigation/navigation";
import { useProList } from "../api/queries";
import {
  MatchCardApi,
  PlayerCardApi,
  LeagueCardApi,
  PagedState,
} from "../components/ApiCards";
import { TeamList } from "../components/TeamList";
export function Pro() {
  const [tab, setTab] = useState("Matches"),
    [q, setQ] = useState("");
  const matches = useProList<MatchSummary>(
    "/pro/matches",
    {},
    tab === "Matches",
  );
  const players = useProList<ProPlayer>(
    "/pro/players",
    { q: q.trim() || undefined },
    tab === "Players",
  );
  const leagues = useProList<League>(
    "/pro/leagues",
    { q: q.trim() || undefined },
    tab === "Tournaments",
  );
  return (
    <View style={{ gap: 12 }}>
      <Choices
        items={["Matches", "Teams", "Players", "Tournaments"]}
        value={tab}
        onChange={(v) => {
          setTab(v);
          setQ("");
        }}
      />
      {tab === "Matches" && (
        <>
          <Notice>Latest professional match results from OpenDota.</Notice>
          <Button onPress={() => go("live")}>Live matches</Button>
          {matches.data?.pages
            .flatMap((p) => p.data.items)
            .map((m) => (
              <MatchCardApi key={m.match_id} match={m} />
            ))}
          <PagedState
            query={matches}
            empty={!matches.data?.pages[0].data.items.length}
          />
        </>
      )}
      {tab === "Teams" && <TeamList />}
      {(tab === "Players" || tab === "Tournaments") && (
        <TextInput
          accessibilityLabel={
            tab === "Players" ? "Search pro players" : "Search tournaments"
          }
          style={[s.input, { flex: undefined }]}
          value={q}
          onChangeText={setQ}
          placeholder={
            tab === "Players" ? "Search pro players" : "Search tournaments"
          }
          placeholderTextColor={C.subtle}
        />
      )}
      {tab === "Players" && (
        <>
          {players.data?.pages
            .flatMap((p) => p.data.items)
            .map((p) => (
              <PlayerCardApi key={p.account_id} player={p} />
            ))}
          <PagedState
            query={players}
            empty={!players.data?.pages[0].data.items.length}
          />
        </>
      )}
      {tab === "Tournaments" && (
        <>
          {leagues.data?.pages
            .flatMap((p) => p.data.items)
            .map((l) => (
              <LeagueCardApi key={l.league_id} league={l} />
            ))}
          <PagedState
            query={leagues}
            empty={!leagues.data?.pages[0].data.items.length}
          />
        </>
      )}
    </View>
  );
}
