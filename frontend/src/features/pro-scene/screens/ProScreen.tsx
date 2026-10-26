import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import {
  TEAMS,
  LEAGUES,
  PRO_MATCHES,
  LIVE_MATCHES,
} from "@/features/pro-scene/data/pro";
import { PRO_PLAYERS } from "@/features/players/data/players";
import { fmtPct } from "@/shared/utils/format";
import { C, s } from "@/shared/theme/theme";
import { Art } from "@/shared/ui/Art";
import { Card } from "@/shared/ui/Card";
import { Choices } from "@/shared/ui/Choices";
import { Section } from "@/shared/ui/Section";
import { Txt } from "@/shared/ui/Txt";
import { go } from "@/shared/navigation/navigation";
import { ProMatchCard } from "@/features/pro-scene/components/ProMatchCard";
import { LeagueCard } from "@/features/pro-scene/components/LeagueCard";
import { LiveCard } from "@/features/pro-scene/components/LiveCard";
import { TeamList } from "@/features/pro-scene/components/TeamList";

export function Pro() {
  const [tab, setTab] = useState("Matches"),
    [league, setLeague] = useState("All tournaments"),
    [role, setRole] = useState("All roles"),
    [q, setQ] = useState(""),
    [status, setStatus] = useState("All");
  return (
    <View style={{ gap: 12 }}>
      <Choices
        items={["Matches", "Teams", "Players", "Tournaments"]}
        value={tab}
        onChange={setTab}
      />
      {tab === "Matches" && (
        <>
          <Section
            title="Live now"
            eyebrow="Mock preview"
            action="All live"
            onPress={() => go("live")}
          />
          <LiveCard m={LIVE_MATCHES[0]} compact />
          <Choices
            items={["All tournaments", ...LEAGUES.map((l) => l.short)]}
            value={league}
            onChange={setLeague}
          />
          {LEAGUES.filter(
            (l) => league === "All tournaments" || l.short === league,
          ).map((l) => (
            <View key={l.leagueid} style={{ gap: 8 }}>
              <Section
                title={l.name}
                action="Event"
                onPress={() => go("league", { id: l.leagueid })}
              />
              {PRO_MATCHES.filter((m) => m.leagueid === l.leagueid).map((m) => (
                <ProMatchCard key={m.match_id} m={m} />
              ))}
            </View>
          ))}
        </>
      )}
      {tab === "Teams" && <TeamList />}
      {tab === "Players" && (
        <>
          <TextInput
            accessibilityLabel="Search pro players or teams"
            style={[s.input, { flex: undefined }]}
            value={q}
            onChangeText={setQ}
            placeholder="Search pro players or teams"
            placeholderTextColor={C.subtle}
          />
          <Choices
            items={[
              "All roles",
              "Carry",
              "Mid",
              "Offlane",
              "Soft Support",
              "Hard Support",
            ]}
            value={role}
            onChange={setRole}
          />
          {TEAMS.map((t) => {
            const players = PRO_PLAYERS.filter(
              (p) =>
                p.pro?.teamId === t.team_id &&
                (role === "All roles" || p.pro.role === role) &&
                (p.name + " " + t.name).toLowerCase().includes(q.toLowerCase()),
            );
            return players.length ? (
              <View key={t.team_id}>
                <Section title={t.name} />
                <Card>
                  {players.map((p) => (
                    <Pressable
                      key={p.account_id}
                      onPress={() => go("player", { id: p.account_id })}
                      style={[s.row, s.divider]}
                    >
                      <Art hero={p.avatarHero} />
                      <View style={{ flex: 1 }}>
                        <Txt bold>
                          {t.tag} {p.name}
                        </Txt>
                        <Txt muted>
                          {p.pro?.role} · {p.pro?.realName}
                        </Txt>
                      </View>
                      <Txt color={C.win}>
                        {fmtPct(p.wins / (p.wins + p.losses))}
                      </Txt>
                    </Pressable>
                  ))}
                </Card>
              </View>
            ) : null;
          })}
        </>
      )}
      {tab === "Tournaments" && (
        <>
          <Choices
            segmented
            items={["All", "Live", "Upcoming", "Done"]}
            value={status}
            onChange={setStatus}
          />
          {LEAGUES.filter(
            (l) =>
              status === "All" ||
              l.status ===
                (status === "Done" ? "completed" : status.toLowerCase()),
          ).map((l) => (
            <LeagueCard key={l.leagueid} league={l} />
          ))}
        </>
      )}
    </View>
  );
}
