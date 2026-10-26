import { useState } from "react";
import { Pressable, View } from "react-native";
import { getHero } from "@/features/heroes/data/heroes";
import { getPlayer } from "@/features/players/data/players";
import { getTeam } from "@/features/pro-scene/data/pro";
import { s } from "@/shared/theme/theme";
import { Card } from "@/shared/ui/Card";
import { Choices } from "@/shared/ui/Choices";
import { Empty } from "@/shared/ui/Empty";
import { IconButton } from "@/shared/ui/IconButton";
import { Txt } from "@/shared/ui/Txt";
import { useAppState } from "@/shared/state/AppState";
import { go } from "@/shared/navigation/navigation";

export function Favorites() {
  const { state, set } = useAppState();
  const [kind, setKind] = useState("Heroes");
  const key = kind.toLowerCase() as "heroes" | "players" | "teams";
  return (
    <View style={{ gap: 12 }}>
      <Choices
        items={["Heroes", "Players", "Teams"]}
        value={kind}
        onChange={setKind}
      />
      {!state[key].length && (
        <Empty text="No favorites yet. Tap the star on a detail screen." />
      )}
      {state[key].map((id) => (
        <Card key={id}>
          <View style={s.between}>
            <Pressable
              onPress={() =>
                go(
                  kind === "Heroes"
                    ? "hero"
                    : kind === "Players"
                      ? "player"
                      : "team",
                  { id },
                )
              }
              style={{ flex: 1 }}
            >
              <Txt bold>
                {kind === "Heroes"
                  ? getHero(id).name
                  : kind === "Players"
                    ? getPlayer(id)?.name
                    : getTeam(id).name}
              </Txt>
            </Pressable>
            <IconButton
              name="close"
              label="Remove favorite"
              onPress={() =>
                set((s) => ({ ...s, [key]: s[key].filter((x) => x !== id) }))
              }
            />
          </View>
        </Card>
      ))}
    </View>
  );
}
