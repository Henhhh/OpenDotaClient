import { View } from "react-native";
import { C } from "@/shared/theme/theme";

export function ResultStrip({ results }: { results: boolean[] }) {
  return (
    <View style={{ flexDirection: "row", gap: 3, marginVertical: 8 }}>
      {results.map((win, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: 12,
            borderRadius: 3,
            backgroundColor: win ? C.win : "#bd4b53",
          }}
        />
      ))}
    </View>
  );
}
