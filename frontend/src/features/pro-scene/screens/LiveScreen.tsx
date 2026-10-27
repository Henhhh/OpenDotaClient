import { View } from "react-native";
import { usePro } from "../api/queries";
import { ApiState } from "@/shared/ui/ApiState";
import { Txt } from "@/shared/ui/Txt";
import type { Page, LiveMatch } from "@/shared/api/client";
export function Live() {
  const query = usePro<Page<LiveMatch>>("/pro/live");
  return (
    <View style={{ gap: 12 }}>
      <ApiState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {query.data && <Txt>No live matches available.</Txt>}
    </View>
  );
}
