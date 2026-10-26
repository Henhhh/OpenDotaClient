import { Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { C } from "@/shared/theme/theme";

export function Brand() {
  return (
    <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
      <Svg width={28} height={32} viewBox="0 0 32 36">
        <Path d="M16 1 30 9v18l-14 8L2 27V9Z" fill={C.red} stroke="#ef8c6d" />
        <Path d="m9 10 14 4v12H9Zm3 3v10h8v-7Zm-3-3 14 16" fill="white" />
      </Svg>
      <View>
        <Text
          style={{
            fontFamily: "Inter_800ExtraBold",
            fontSize: 17,
            color: C.text,
          }}
        >
          Open<Text style={{ color: C.red }}>Dota</Text>
        </Text>
        <Text
          style={{
            fontSize: 7,
            fontFamily: "Inter_700Bold",
            letterSpacing: 2,
            color: C.gold,
          }}
        >
          MOBILE
        </Text>
      </View>
    </View>
  );
}
