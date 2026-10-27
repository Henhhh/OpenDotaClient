import { useState } from "react";
import { View } from "react-native";
import { Choices } from "@/shared/ui/Choices";
import { Notice } from "@/shared/ui/Notice";
import { HeroRanks } from "@/features/heroes/screens/HeroRanksScreen";
import { TeamList } from "../components/TeamList";
export function Rankings() {
  const [tab, setTab] = useState("Teams");
  return (
    <View style={{ gap: 12 }}>
      <Choices
        segmented
        items={["Players", "Teams", "Heroes"]}
        value={tab}
        onChange={setTab}
      />
      {tab === "Teams" ? (
        <TeamList />
      ) : tab === "Heroes" ? (
        <HeroRanks />
      ) : (
        <Notice>
          Regional player MMR leaderboards are not available in API v1. Hero
          player rankings are available on each hero detail screen.
        </Notice>
      )}
    </View>
  );
}
