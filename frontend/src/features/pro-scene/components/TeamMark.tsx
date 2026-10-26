import { View } from "react-native";
import type { Team } from "@/shared/types/domain";
import { Txt } from "@/shared/ui/Txt";

export function TeamMark({ team }: { team: Team }) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: team.color,
        borderRadius: 10,
        width: 40,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: team.color2,
      }}
    >
      <Txt bold color={team.color} size={10}>
        {team.tag}
      </Txt>
    </View>
  );
}
