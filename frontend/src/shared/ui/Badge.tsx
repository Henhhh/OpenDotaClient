import { Text } from "react-native";
import { C } from "@/shared/theme/theme";

export function Badge({ text = "SAMPLE DATA" }: { text?: string }) {
  return (
    <Text
      style={{
        color: C.gold,
        fontSize: 9,
        fontWeight: "800",
        letterSpacing: 0.5,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: "#79603b",
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 3,
        alignSelf: "flex-start",
      }}
    >
      • {text}
    </Text>
  );
}
