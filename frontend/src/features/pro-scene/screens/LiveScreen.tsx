import { View } from "react-native";
import { LIVE_MATCHES } from "@/features/pro-scene/data/pro";
import { Notice } from "@/shared/ui/Notice";
import { LiveCard } from "@/features/pro-scene/components/LiveCard";

export function Live() {
  return (
    <View style={{ gap: 14 }}>
      <Notice>
        Mock preview. Scores, heroes and timers are simulated, not live.
      </Notice>
      {LIVE_MATCHES.map((m) => (
        <LiveCard key={m.id} m={m} />
      ))}
    </View>
  );
}
