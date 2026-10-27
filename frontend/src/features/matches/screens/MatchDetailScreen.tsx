import { useState } from "react";
import { Pressable, View } from "react-native";
import type { MatchDetail as MatchData } from "@/shared/api/client";
import { usePlayerApi, validId } from "@/features/players/api/queries";
import { useSession } from "@/features/auth/SessionProvider";
import { heroPresentation } from "@/features/heroes/data/presentation";
import { ApiState, numberText } from "@/shared/ui/ApiState";
import { Card } from "@/shared/ui/Card";
import { Choices } from "@/shared/ui/Choices";
import { Txt } from "@/shared/ui/Txt";
import { Spark } from "@/shared/ui/Spark";
import { Art } from "@/shared/ui/Art";
import { Notice } from "@/shared/ui/Notice";
import { C, s } from "@/shared/theme/theme";
import { go } from "@/shared/navigation/navigation";
import { fmtDuration, GAME_MODES } from "@/shared/utils/format";
import { ParsePanel } from "../components/ParsePanel";
import { MatchInventory } from "../components/MatchInventory";
export function MatchDetail({ id }: { id: string }) {
  const [tab, setTab] = useState("Overview"),
    { session } = useSession();
  const q = usePlayerApi<MatchData>(`/matches/${id}`, {}, validId(id)),
    m = q.data?.data;
  return (
    <View style={{ gap: 12 }}>
      <ApiState
        pending={q.isPending}
        error={q.error}
        retry={() => void q.refetch()}
      />
      {m && (
        <>
          <Txt muted>
            Match {m.match_id} ·{" "}
            {new Date(m.start_time * 1000).toLocaleString()}
          </Txt>
          <Card>
            <Txt
              bold
              size={24}
              color={
                m.radiant_win == null ? C.muted : m.radiant_win ? C.win : C.loss
              }
            >
              {m.radiant_win == null
                ? "Result unavailable"
                : m.radiant_win
                  ? "Radiant Victory"
                  : "Dire Victory"}
            </Txt>
            <Txt bold size={28}>
              {numberText(m.radiant_score)} : {numberText(m.dire_score)}
            </Txt>
            <Txt muted>
              {GAME_MODES[m.game_mode] ?? `Mode ${m.game_mode}`} ·{" "}
              {fmtDuration(m.duration)}
            </Txt>
          </Card>
          <Choices
            items={["Overview", "Scoreboard", "Draft", "Analysis", "Builds"]}
            value={tab}
            onChange={setTab}
          />
          {tab === "Overview" && (
            <Card>
              <Txt bold>Gold advantage</Txt>
              {m.radiant_gold_adv?.length ? (
                <Spark key={id + "gold"} values={m.radiant_gold_adv} />
              ) : (
                <Txt muted>Gold advantage unavailable.</Txt>
              )}
            </Card>
          )}
          {tab === "Scoreboard" &&
            m.players.map((p) => (
              <Pressable
                key={p.player_slot}
                disabled={!p.account_id}
                onPress={() =>
                  p.account_id && go("player", { id: p.account_id })
                }
              >
                <Card>
                  <View style={s.row}>
                    <Art hero={heroPresentation(p.hero_id).key} />
                    <View style={{ flex: 1 }}>
                      <Txt bold>
                        {p.name ??
                          (p.account_id
                            ? `Player ${p.account_id}`
                            : "Anonymous player")}
                      </Txt>
                      <Txt muted>
                        {heroPresentation(p.hero_id).name} ·{" "}
                        {p.player_slot < 128 ? "Radiant" : "Dire"} · Level{" "}
                        {numberText(p.level)}
                      </Txt>
                    </View>
                    <Txt>
                      {p.kills}/{p.deaths}/{p.assists}
                    </Txt>
                  </View>
                  <Txt muted>
                    GPM {numberText(p.gold_per_min)} · XPM{" "}
                    {numberText(p.xp_per_min)} · Damage{" "}
                    {numberText(p.hero_damage)}
                  </Txt>
                </Card>
              </Pressable>
            ))}
          {tab === "Draft" &&
            (m.picks_bans?.length ? (
              m.picks_bans.map((p) => (
                <Card key={p.order}>
                  <View style={s.row}>
                    <Art hero={heroPresentation(p.hero_id).key} />
                    <Txt>
                      {p.team === 0 ? "Radiant" : "Dire"} ·{" "}
                      {p.is_pick ? "Pick" : "Ban"} ·{" "}
                      {heroPresentation(p.hero_id).name}
                    </Txt>
                  </View>
                </Card>
              ))
            ) : (
              <Notice>Draft unavailable for this match.</Notice>
            ))}
          {tab === "Analysis" && (
            <>
              {m.radiant_xp_adv?.length ? (
                <Card>
                  <Txt bold>Experience advantage</Txt>
                  <Spark key={id + "xp"} values={m.radiant_xp_adv} />
                </Card>
              ) : (
                <Notice>Experience advantage unavailable.</Notice>
              )}
              <Notice>
                Objectives and teamfight events are unavailable in API v1.
              </Notice>
              {!m.parsed && (
                <ParsePanel
                  key={id + ":" + (session?.user.user_id ?? "guest")}
                  id={id}
                />
              )}
            </>
          )}
          {tab === "Builds" &&
            m.players.map((p) => (
              <View key={p.player_slot} style={{ gap: 8 }}>
                <Txt bold>
                  {heroPresentation(p.hero_id).name} ·{" "}
                  {p.name ?? "Anonymous player"}
                </Txt>
                <MatchInventory player={p} />
              </View>
            ))}
          <Txt muted size={10}>
            Fetched {new Date(q.data!.meta.fetched_at).toLocaleString()}
            {q.data!.meta.stale ? " · Cached data" : ""}
          </Txt>
        </>
      )}
    </View>
  );
}
