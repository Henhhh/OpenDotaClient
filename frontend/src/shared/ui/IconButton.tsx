import { Pressable } from "react-native";
import { Icon } from "@/shared/ui/Icon";

export function IconButton({
  name,
  onPress,
  label,
  color,
}: {
  name: string;
  onPress: () => void;
  label?: string;
  color?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? name}
      onPress={onPress}
      style={{
        width: 42,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon name={name} color={color} />
    </Pressable>
  );
}
