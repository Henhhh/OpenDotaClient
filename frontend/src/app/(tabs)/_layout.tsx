import { Tabs } from "expo-router";
import { C } from "@/shared/theme/theme";

export default function TabLayout() {
  return (
    <Tabs
      tabBar={() => null}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: C.bg },
        animation: "none",
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="matches" />
      <Tabs.Screen name="heroes" />
      <Tabs.Screen name="pro" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
