import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { C } from "@/shared/theme/theme";
import { Txt } from "@/shared/ui/Txt";

export function Ring({ value, size = 100 }: { value: number; size?: number }) {
  const circ = 2 * Math.PI * 42;
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        style={{ position: "absolute" }}
      >
        <Circle
          cx={50}
          cy={50}
          r={42}
          fill="none"
          stroke={C.line}
          strokeWidth={9}
        />
        <Circle
          cx={50}
          cy={50}
          r={42}
          fill="none"
          stroke={C.win}
          strokeWidth={9}
          strokeDasharray={`${circ * value} ${circ}`}
          transform="rotate(-90 50 50)"
        />
      </Svg>
      <Txt bold size={23}>
        {(value * 100).toFixed(1)}%
      </Txt>
      <Txt muted size={9}>
        WIN RATE
      </Txt>
    </View>
  );
}
