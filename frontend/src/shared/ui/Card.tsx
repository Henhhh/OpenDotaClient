import { type ReactNode } from "react";
import { View } from "react-native";
import { s } from "@/shared/theme/theme";

export function Card({ children }: { children: ReactNode }) {
  return <View style={s.card}>{children}</View>;
}
