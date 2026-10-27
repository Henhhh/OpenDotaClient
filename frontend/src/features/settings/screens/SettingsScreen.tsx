import { useState } from "react";
import { View, Switch } from "react-native";
import { useSession } from "@/features/auth/SessionProvider";
import { AccountGate, AuthForm } from "@/features/auth/AccountGate";
import { useSettings, useAccountMutation } from "@/features/account/api";
import { apiRequest, type Settings as SettingsDto } from "@/shared/api/client";
import { ApiState } from "@/shared/ui/ApiState";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Notice } from "@/shared/ui/Notice";
import { Section } from "@/shared/ui/Section";
import { Txt } from "@/shared/ui/Txt";
import { useAppState } from "@/shared/state/AppState";
import { go } from "@/shared/navigation/navigation";
function Preferences() {
  const query = useSettings(),
    mutation = useAccountMutation((value: boolean) =>
      apiRequest<SettingsDto>("/me/settings", {
        method: "PATCH",
        body: { in_app_notifications: value },
      }),
    );
  return (
    <View style={{ gap: 12 }}>
      <ApiState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {query.data && (
        <Card>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Txt>In-app notifications</Txt>
            <Switch
              accessibilityLabel="Enable in-app notifications"
              value={query.data.data.in_app_notifications}
              disabled={mutation.isPending}
              onValueChange={(value) => mutation.mutate(value)}
            />
          </View>
          <Txt muted>
            Saved theme: {query.data.data.theme} · Language:{" "}
            {query.data.data.language}
          </Txt>
          <Txt muted>The current display supports dark theme and English.</Txt>
        </Card>
      )}
      {mutation.error && <Notice>{mutation.error.message}</Notice>}
    </View>
  );
}
export function Settings() {
  const auth = useSession(),
    { set } = useAppState(),
    [message, setMessage] = useState("");
  return (
    <View style={{ gap: 12 }}>
      <Section title="Account" />
      <AccountGate>
        <Card>
          <Txt bold>{auth.session?.user.name}</Txt>
          <Txt muted>
            {auth.session?.user.email ?? "Email sign-in is not set up yet"}
          </Txt>
          <Txt muted>
            Session expires{" "}
            {auth.session?.expires_at
              ? new Date(auth.session.expires_at).toLocaleDateString()
              : ""}
          </Txt>
          <Button
            onPress={() => {
              if (!auth.busy)
                void auth.logout().catch((e) => setMessage(e.message));
            }}
          >
            {auth.busy ? "Signing out…" : "Sign out"}
          </Button>
        </Card>
      </AccountGate>
      {auth.session && !auth.session.user.email && <AuthForm upgrade />}
      {auth.session && (
        <>
          <Section title="Preferences" />
          <Preferences />
        </>
      )}
      {!!message && <Notice>{message}</Notice>}
      <Section title="Library" />
      <Button onPress={() => go("favorites")}>Favorites</Button>
      <Button onPress={() => go("notifications")}>In-app notifications</Button>
      <Section title="Data" />
      <Notice>
        Pro Scene, heroes and search use OpenDota data. Some player and match
        statistics are not available yet.
      </Notice>
      <Button
        onPress={() => {
          set((s) => ({ ...s, history: [], parsed: [] }));
          setMessage("Local search history cleared.");
        }}
      >
        Clear local search history
      </Button>
      <Card>
        <Txt bold>OpenDota Mobile</Txt>
        <Txt muted>React Native · Expo · TypeScript</Txt>
      </Card>
    </View>
  );
}
