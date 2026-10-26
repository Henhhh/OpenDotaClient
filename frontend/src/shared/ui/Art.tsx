import { useState } from "react";
import { Image, View } from "react-native";
import { C } from "@/shared/theme/theme";
import { heroSource } from "@/shared/assets/hero-art";
import { Icon } from "@/shared/ui/Icon";

export function Art({
  hero,
  width = 44,
  height = 44,
}: {
  hero: string;
  width?: number;
  height?: number;
}) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <View
      style={{
        width,
        height,
        backgroundColor: C.raised,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon name="heroes" />
    </View>
  ) : (
    <Image
      accessibilityLabel={hero.replaceAll("_", " ")}
      source={heroSource(hero)}
      onError={() => setFailed(true)}
      style={{ width, height, borderRadius: 8 }}
    />
  );
}
