import { useState } from "react";
import { View } from "react-native";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Notice } from "@/shared/ui/Notice";
import { Section } from "@/shared/ui/Section";
import { Txt } from "@/shared/ui/Txt";
import { useAppState } from "@/shared/state/AppState";
import { go } from "@/shared/navigation/navigation";

export function Settings() {
  const { set } = useAppState();
  const [message, setMessage] = useState("");
  return (
    <View style={{ gap: 12 }}>
      <Section title="Account" />
      <Card>
        <Txt bold>Kaito · Sample profile</Txt>
        <Button
          onPress={() =>
            setMessage(
              "Steam sign-in requires a backend for OpenID verification. It is not connected in this sample app.",
            )
          }
        >
          Sign in with Steam
        </Button>
      </Card>
      {!!message && <Notice>{message}</Notice>}
      <Section title="Library" />
      <Button onPress={() => go("favorites")}>Favorites</Button>
      <Button onPress={() => go("notifications")}>In-app notifications</Button>
      <Section title="Data" />
      <Notice>
        The app uses bundled sample data. Refresh reloads the local data source;
        live OpenDota and Steam authentication are not connected.
      </Notice>
      <Button
        onPress={() => {
          set((s) => ({ ...s, history: [], parsed: [] }));
          setMessage("Search history and sample parse requests cleared.");
        }}
      >
        Clear cached sample data
      </Button>
      <Section title="About" />
      <Card>
        <Txt bold>OpenDota Mobile</Txt>
        <Txt muted>React Native · Expo · TypeScript</Txt>
        <Badge />
      </Card>
    </View>
  );
}
