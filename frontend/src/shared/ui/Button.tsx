import { type ReactNode } from "react";
import { Pressable } from "react-native";
import { C } from "@/shared/theme/theme";
import { Txt } from "@/shared/ui/Txt";

export function Button({
  children,
  onPress,
  primary = false,
}: {
  children: ReactNode;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: primary ? C.red : C.raised,
        padding: 13,
        borderRadius: 24,
        alignItems: "center",
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Txt bold>{children}</Txt>
    </Pressable>
  );
}
