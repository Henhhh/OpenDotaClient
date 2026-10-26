import { useState } from "react";
import { Pressable, View } from "react-native";
import { getHero } from "@/features/heroes/data/heroes";
import { getMatch } from "@/features/matches/data/matches";
import { fmtDuration, GAME_MODES } from "@/shared/utils/format";
import { C, s } from "@/shared/theme/theme";
import { Art } from "@/shared/ui/Art";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Choices } from "@/shared/ui/Choices";
import { Notice } from "@/shared/ui/Notice";
import { Section } from "@/shared/ui/Section";
import { Spark } from "@/shared/ui/Spark";
import { Txt } from "@/shared/ui/Txt";
import { go } from "@/shared/navigation/navigation";
import { useAppState } from "@/shared/state/AppState";

export function MatchDetail({ id }: { id: number }) {
  const m = getMatch(id),
    [tab, setTab] = useState("Overview");
  const { state, set } = useAppState();
  const parsed = m.parsed || state.parsed.includes(id);
  return (
    <View style={{ gap: 12 }}>
      <Notice>Sample match data · Match {id}</Notice>
      <Card>
        <Txt color={m.radiant_win ? C.win : C.loss} bold size={24}>
          {m.radiant_win ? "Radiant" : "Dire"} Victory
        </Txt>
        <Txt bold size={28}>
          {m.radiant_score} : {m.dire_score}
        </Txt>
        <Txt muted>
          {GAME_MODES[m.game_mode]} · {fmtDuration(m.duration)} · {m.region}
        </Txt>
      </Card>
      <Choices
        items={["Overview", "Scoreboard", "Draft", "Analysis", "Builds"]}
        value={tab}
        onChange={setTab}
      />
      {tab === "Overview" && (
        <>
          <Section title="Gold advantage" />
          <Card>
            <Spark values={m.radiant_gold_adv} />
          </Card>
          <Section title="Objectives" />
          {m.objectives.map((e, i) => (
            <Card key={i}>
              <Txt>
                {fmtDuration(e.time)} · {e.label}
              </Txt>
            </Card>
          ))}
        </>
      )}
      {tab === "Scoreboard" &&
        m.players.map((p) => (
          <Pressable
            key={p.player_slot}
            onPress={() => p.account_id && go("player", { id: p.account_id })}
          >
            <Card>
              <View style={s.row}>
                <Art hero={getHero(p.hero_id).key} />
                <View style={{ flex: 1 }}>
                  <Txt bold>{p.name}</Txt>
                  <Txt muted>
                    {getHero(p.hero_id).name} · Level {p.level}
                  </Txt>
                </View>
                <Txt>
                  {p.kills}/{p.deaths}/{p.assists}
                </Txt>
              </View>
              <Txt muted>
                GPM {p.gold_per_min} · XPM {p.xp_per_min} · Damage{" "}
                {p.hero_damage.toLocaleString()}
              </Txt>
            </Card>
          </Pressable>
        ))}
      {tab === "Draft" &&
        m.picks_bans.map((p, i) => (
          <Card key={i}>
            <View style={s.row}>
              <Art hero={getHero(p.hero_id).key} />
              <Txt>
                {p.team === 0 ? "Radiant" : "Dire"} ·{" "}
                {p.is_pick ? "Pick" : "Ban"} · {getHero(p.hero_id).name}
              </Txt>
            </View>
          </Card>
        ))}
      {tab === "Analysis" &&
        (parsed ? (
          <>
            <Section title="Experience advantage" />
            <Card>
              <Spark values={m.radiant_xp_adv} />
            </Card>
            <Section title="Teamfights" />
            {m.teamfights.map((t, i) => (
              <Card key={i}>
                <Txt>
                  {fmtDuration(t.start)} – {fmtDuration(t.end)}
                </Txt>
                <Txt muted>
                  Radiant deaths {t.radiantDeaths} · Dire deaths {t.direDeaths}{" "}
                  · Gold swing {t.goldSwing}
                </Txt>
              </Card>
            ))}
          </>
        ) : (
          <Card>
            <Txt bold>Match parsing required</Txt>
            <Txt muted>Preview replay statistics using sample data.</Txt>
            <Button
              onPress={() => set((s) => ({ ...s, parsed: [...s.parsed, id] }))}
            >
              Preview sample parse
            </Button>
          </Card>
        ))}
      {tab === "Builds" &&
        m.players.map((p) => (
          <Button
            key={p.player_slot}
            onPress={() =>
              go("build", {
                heroId: p.hero_id,
                matchId: id,
                slot: p.player_slot,
              })
            }
          >
            {getHero(p.hero_id).name} · {p.name}
          </Button>
        ))}
    </View>
  );
}
