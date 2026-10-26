import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { ME_ID, getPlayer } from "@/features/players/data/players";
import { rankIcon, rankLabel } from "@/shared/utils/assets";
import { fmtPct, fmtNum } from "@/shared/utils/format";
import { Art } from "@/shared/ui/Art";
import { Card } from "@/shared/ui/Card";
import { Empty } from "@/shared/ui/Empty";
import { IconButton } from "@/shared/ui/IconButton";
import { Txt } from "@/shared/ui/Txt";
import { C, s } from "@/shared/theme/theme";
import { useFavorite } from "@/shared/state/AppState";

export function ProfileHeader({ id = ME_ID }: { id?: number }) {
  const p = getPlayer(id);
  const [copied, setCopied] = useState(false);
  const [favorite, toggle] = useFavorite("players", id);
  if (!p) return <Empty text="Private or unknown player profile" />;
  return (
    <View style={{ gap: 16 }}>
      <View style={s.row}>
        <Art hero={p.avatarHero} width={64} height={64} />
        <View style={{ flex: 1 }}>
          <Txt bold size={22}>
            {p.name}{" "}
            {p.plus && (
              <Text style={{ fontSize: 10, color: C.gold }}>PLUS</Text>
            )}
          </Txt>
          <Txt muted>
            {p.country} · {p.pro ? "Pro" : "Public"} player
          </Txt>
          <Pressable
            onPress={() => {
              void Clipboard.setStringAsync(String(id)).then(() =>
                setCopied(true),
              );
            }}
          >
            <Txt muted size={10}>
              {copied ? "Copied!" : "Steam ID " + id + "  ▢"}
            </Txt>
          </Pressable>
        </View>
        <Image
          source={{ uri: rankIcon(p.rank_tier ?? 0, p.leaderboard_rank) }}
          style={{ width: 60, height: 60 }}
        />
        {id !== ME_ID && (
          <IconButton
            name="star"
            onPress={toggle}
            color={favorite ? C.gold : C.muted}
          />
        )}
      </View>
      <Card>
        <View style={s.between}>
          {[
            ["WINS", fmtNum(p.wins), C.win],
            ["LOSSES", fmtNum(p.losses), C.loss],
            ["WIN RATE", fmtPct(p.wins / (p.wins + p.losses)), C.win],
            ["RANK", rankLabel(p.rank_tier), C.text],
          ].map(([label, v, color]) => (
            <View key={label}>
              <Txt muted size={9}>
                {label}
              </Txt>
              <Txt bold color={color} size={12}>
                {v}
              </Txt>
            </View>
          ))}
        </View>
      </Card>
    </View>
  );
}
