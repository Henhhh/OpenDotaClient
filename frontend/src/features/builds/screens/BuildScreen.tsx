import { useState } from "react";
import { Image, View } from "react-native";
import { getHero, getAbilities } from "@/features/heroes/data/heroes";
import { buildFor, getItem } from "@/features/builds/data/builds";
import { getMatch } from "@/features/matches/data/matches";
import { itemImg } from "@/shared/utils/assets";
import { fmtDuration } from "@/shared/utils/format";
import { C, s } from "@/shared/theme/theme";
import { Badge } from "@/shared/ui/Badge";
import { Card } from "@/shared/ui/Card";
import { Choices } from "@/shared/ui/Choices";
import { Notice } from "@/shared/ui/Notice";
import { Section } from "@/shared/ui/Section";
import { Txt } from "@/shared/ui/Txt";

export function Build({
  heroId,
  matchId,
  slot,
}: {
  heroId: number;
  matchId?: number;
  slot?: number;
}) {
  const [tab, setTab] = useState("Items");
  const h = getHero(heroId),
    build = buildFor(h),
    abilities = getAbilities(heroId);
  const player = matchId
    ? getMatch(matchId).players.find((p) => p.player_slot === slot)
    : undefined;
  return (
    <View style={{ gap: 12 }}>
      <Section title={`${h.name} build`} />
      {player && (
        <>
          <Notice>
            Sample match {matchId} ? {player.name}
          </Notice>
          <Section title="Final inventory" />
          <Card>
            <View style={s.wrap}>
              {player.items.filter(Boolean).map((key, i) => (
                <View key={i}>
                  <Image
                    source={{ uri: itemImg(key!) }}
                    style={{ width: 64, height: 44, borderRadius: 6 }}
                  />
                  <Txt size={9}>{getItem(key!)?.name ?? key}</Txt>
                </View>
              ))}
            </View>
          </Card>
          <Section title="Purchase timeline" />
          <Card>
            {player.purchases.map((purchase, i) => (
              <View key={i} style={s.row}>
                <Image
                  source={{ uri: itemImg(purchase.key) }}
                  style={{ width: 42, height: 30, borderRadius: 5 }}
                />
                <View style={{ flex: 1 }}>
                  <Txt>{getItem(purchase.key)?.name ?? purchase.key}</Txt>
                </View>
                <Txt color={C.gold}>{fmtDuration(purchase.time)}</Txt>
              </View>
            ))}
          </Card>
        </>
      )}
      <Badge />
      <Choices
        items={["Items", "Skills & talents"]}
        value={tab}
        onChange={setTab}
      />
      {tab === "Items" ? (
        Object.entries(build).map(([name, items]) => (
          <Card key={name}>
            <Txt bold>{name.toUpperCase()}</Txt>
            <View style={s.wrap}>
              {(Array.isArray(items) ? items : []).map(
                (key: string, i: number) => (
                  <View key={key + i} style={{ width: 86, gap: 5 }}>
                    <Image
                      source={{ uri: itemImg(key) }}
                      style={{ width: 70, height: 50, borderRadius: 6 }}
                    />
                    <Txt size={10}>{getItem(key)?.name ?? key}</Txt>
                    <Txt color={C.gold} size={10}>
                      {getItem(key)?.cost ?? ""}
                    </Txt>
                  </View>
                ),
              )}
            </View>
          </Card>
        ))
      ) : (
        <>
          <Section title="Skills" />
          {[...abilities.abilities, abilities.ult].map((a, i) => (
            <Card key={i}>
              <Txt bold>{a.name}</Txt>
              <Txt muted>{a.desc.replace(/<[^>]*>/g, "")}</Txt>
            </Card>
          ))}
          <Section title="Talent tree" />
          {abilities.talents.map((pair, i) => (
            <Card key={i}>
              <Txt color={C.gold}>Level {10 + i * 5}</Txt>
              <Txt>{pair.join("  /  ")}</Txt>
            </Card>
          ))}
        </>
      )}
    </View>
  );
}
