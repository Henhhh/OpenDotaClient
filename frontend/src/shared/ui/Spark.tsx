import { useState } from "react";
import { View } from "react-native";
import Svg, { Circle, Line, Polyline } from "react-native-svg";
import { C } from "@/shared/theme/theme";
import { Txt } from "@/shared/ui/Txt";

export function Spark({
  values,
  color = C.gold,
  height = 150,
}: {
  values: number[];
  color?: string;
  height?: number;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const min = Math.min(...values),
    max = Math.max(...values),
    w = 300;
  const pts = values.map((v, i) => [
    10 + (i * 280) / Math.max(1, values.length - 1),
    height - 20 - ((v - min) / Math.max(0.001, max - min)) * (height - 40),
  ]);
  return (
    <View
      accessible
      accessibilityLabel={`Chart, minimum ${min.toFixed(1)}, maximum ${max.toFixed(1)}`}
      onTouchEnd={() => {}}
      onStartShouldSetResponder={() => true}
      onResponderGrant={(e) =>
        setSelected(
          Math.max(
            0,
            Math.min(
              values.length - 1,
              Math.round((e.nativeEvent.locationX / w) * (values.length - 1)),
            ),
          ),
        )
      }
    >
      <Svg width="100%" height={height} viewBox={`0 0 300 ${height}`}>
        {[0.2, 0.5, 0.8].map((y) => (
          <Line
            key={y}
            x1={0}
            x2={300}
            y1={height * y}
            y2={height * y}
            stroke={C.line}
            strokeDasharray="2 5"
          />
        ))}
        <Polyline
          points={pts.map((p) => p.join(",")).join(" ")}
          fill="none"
          stroke={color}
          strokeWidth={2}
        />
        {selected !== null && (
          <Circle
            cx={pts[selected][0]}
            cy={pts[selected][1]}
            r={4}
            fill={color}
          />
        )}
      </Svg>
      {selected !== null && (
        <Txt muted>
          Point {selected + 1}: {values[selected].toFixed(2)}
        </Txt>
      )}
    </View>
  );
}
