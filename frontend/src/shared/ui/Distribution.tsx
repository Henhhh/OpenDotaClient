import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { C, s } from "@/shared/theme/theme";
import { Txt } from "@/shared/ui/Txt";

export function Distribution({
  parts,
}: {
  parts: { label: string; games: number; win: number }[];
}) {
  const total = parts.reduce((sum, p) => sum + p.games, 0),
    colors = [C.red, C.gold, "#4094f7", C.win, "#a777ed"];
  return (
    <View style={s.row}>
      <View
        style={{
          width: 110,
          height: 110,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Svg
          width={110}
          height={110}
          viewBox="0 0 100 100"
          style={{ position: "absolute" }}
        >
          {parts.map((p, i) => {
            const start =
              parts.slice(0, i).reduce((sum, part) => sum + part.games, 0) /
              total;
            return (
              <Circle
                key={p.label}
                cx={50}
                cy={50}
                r={40}
                fill="none"
                stroke={colors[i % colors.length]}
                strokeWidth={12}
                strokeDasharray={`${Math.max(0, (p.games / total) * 251.3 - 2)} 251.3`}
                strokeDashoffset={-start * 251.3}
                transform="rotate(-90 50 50)"
              />
            );
          })}
        </Svg>
        <Txt bold>{(total / 1000).toFixed(1)}k</Txt>
        <Txt muted size={10}>
          games
        </Txt>
      </View>
      <View style={{ flex: 1, gap: 8 }}>
        {parts.map((p, i) => (
          <View key={p.label} style={[s.between, { gap: 4 }]}>
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 2,
                backgroundColor: colors[i % colors.length],
              }}
            />
            <View style={{ flex: 1 }}>
              <Txt muted size={10}>
                {p.label}
              </Txt>
            </View>
            <Txt bold size={10}>
              {Math.round((p.games / total) * 100)}%
            </Txt>
            <Txt color={C.win} size={10}>
              {Math.round((p.win / p.games) * 100)}%
            </Txt>
          </View>
        ))}
      </View>
    </View>
  );
}
