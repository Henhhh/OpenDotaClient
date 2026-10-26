import { type ReactNode } from "react";
import { View } from "react-native";
import { Txt } from "@/shared/ui/Txt";

export function Notice({ children }: { children: ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: "#25211b",
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#483820",
      }}
    >
      <Txt muted size={12}>
        {children}
      </Txt>
    </View>
  );
}
