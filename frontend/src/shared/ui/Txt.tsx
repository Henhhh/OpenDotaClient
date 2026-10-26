import { type ReactNode } from "react";
import { Text } from "react-native";
import { C } from "@/shared/theme/theme";

export function Txt({
  children,
  muted = false,
  color,
  bold = false,
  size = 13,
}: {
  children: ReactNode;
  muted?: boolean;
  color?: string;
  bold?: boolean;
  size?: number;
}) {
  return (
    <Text
      style={{
        color: color ?? (muted ? C.muted : C.text),
        fontSize: size,
        fontWeight: bold ? "700" : "400",
        fontFamily: bold ? "Inter_700Bold" : "Inter_400Regular",
        lineHeight: size * 1.45,
      }}
    >
      {children}
    </Text>
  );
}
