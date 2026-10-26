import { heroSource } from "@/shared/assets/hero-art";
import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import {
  heroStats,
  getHero,
  getAbilities,
  heroMatchups,
} from "@/features/heroes/data/heroes";
import { getPlayer } from "@/features/players/data/players";
import { heroTopPlayers } from "@/features/matches/data/matches";
import { ATTR_LABEL, abilityImg } from "@/shared/utils/assets";
import { fmtPct } from "@/shared/utils/format";
import { C, s } from "@/shared/theme/theme";
import { Art } from "@/shared/ui/Art";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Choices } from "@/shared/ui/Choices";
import { IconButton } from "@/shared/ui/IconButton";
import { Section } from "@/shared/ui/Section";
import { Spark } from "@/shared/ui/Spark";
import { Txt } from "@/shared/ui/Txt";
import { go } from "@/shared/navigation/navigation";
import { useFavorite } from "@/shared/state/AppState";
import { Build } from "@/features/builds/screens/BuildScreen";

export function HeroDetail({ id }: { id: number }) {
  const h = getHero(id),
    stats = heroStats(id),
    abilities = getAbilities(id);
  const [tab, setTab] = useState("Overview");
  const [favorite, toggle] = useFavorite("heroes", id);
  return (
    <View style={{ gap: 12 }}>
      <Image
        source={heroSource(h.key)}
        style={{ height: 200, width: "100%", borderRadius: 20 }}
      />
      <View style={s.between}>
        <View>
          <Text style={s.title}>{h.name}</Text>
          <Txt muted>
            {ATTR_LABEL[h.attr]} · {h.attack}
          </Txt>
        </View>
        <IconButton
          name="star"
          color={favorite ? C.gold : C.muted}
          onPress={toggle}
        />
      </View>
      <Badge />
      <Choices
        items={["Overview", "Statistics", "Matchups", "Builds", "Players"]}
        value={tab}
        onChange={setTab}
      />
      {tab === "Overview" && (
        <>
          <Card>
            <Txt>{h.roles.join(" · ")}</Txt>
            <Txt>
              Health {h.hp} · Armor {h.armor} · Speed {h.ms}
            </Txt>
            <Txt>
              STR {h.str} +{h.strGain} · AGI {h.agi} +{h.agiGain} · INT {h.int}{" "}
              +{h.intGain}
            </Txt>
          </Card>
          <Section title="Abilities" />
          {[...abilities.abilities, abilities.ult].map((a, i) => (
            <Card key={a.key + i}>
              <View style={s.row}>
                <Image
                  source={{ uri: abilityImg(a.key) }}
                  style={{ width: 44, height: 44, borderRadius: 8 }}
                />
                <Txt bold>{a.name}</Txt>
              </View>
              <Txt muted>{a.desc.replace(/<[^>]*>/g, "")}</Txt>
              <Txt muted>
                Cooldown {a.cd ?? "—"} · Mana {a.mc ?? "—"}
              </Txt>
            </Card>
          ))}
        </>
      )}
      {tab === "Statistics" && (
        <>
          <Card>
            <Txt>
              Win rate {fmtPct(stats.winRate)} · Pick rate{" "}
              {fmtPct(stats.pickRate)}
            </Txt>
            <Txt>
              Pro picks {stats.proPicks} · Pro wins {stats.proWins}
            </Txt>
            <Spark values={stats.trend} />
          </Card>
          <Button onPress={() => go("heroRanks")}>Stats by rank</Button>
        </>
      )}
      {tab === "Matchups" &&
        heroMatchups(id)
          .sort((a, b) => b.wins / b.games_played - a.wins / a.games_played)
          .map((r) => (
            <Pressable
              key={r.hero_id}
              onPress={() => go("hero", { id: r.hero_id })}
            >
              <Card>
                <View style={s.row}>
                  <Art hero={getHero(r.hero_id).key} />
                  <View style={{ flex: 1 }}>
                    <Txt bold>{getHero(r.hero_id).name}</Txt>
                    <Txt muted>{r.games_played} matches</Txt>
                  </View>
                  <Txt color={C.win}>{fmtPct(r.wins / r.games_played)}</Txt>
                </View>
              </Card>
            </Pressable>
          ))}
      {tab === "Builds" && <Build heroId={id} />}
      {tab === "Players" &&
        heroTopPlayers(id).map((r) => (
          <Pressable
            key={r.account_id}
            onPress={() => go("player", { id: r.account_id })}
          >
            <Card>
              <View style={s.row}>
                <Art hero={getPlayer(r.account_id)!.avatarHero} />
                <View style={{ flex: 1 }}>
                  <Txt bold>{getPlayer(r.account_id)!.name}</Txt>
                  <Txt muted>{r.games} matches</Txt>
                </View>
                <Txt color={C.win}>{fmtPct(r.wins / r.games)}</Txt>
              </View>
            </Card>
          </Pressable>
        ))}
    </View>
  );
}
