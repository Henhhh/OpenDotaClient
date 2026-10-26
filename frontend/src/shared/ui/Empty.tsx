import { View } from "react-native";
import { Icon } from "@/shared/ui/Icon";
import { Txt } from "@/shared/ui/Txt";

export function Empty({
  text = "No results for these filters.",
}: {
  text?: string;
}) {
  return (
    <View style={{ padding: 36, alignItems: "center", gap: 12 }}>
      <Icon name="search" size={32} />
      <Txt muted>{text}</Txt>
    </View>
  );
}
