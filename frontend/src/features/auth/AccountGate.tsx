import { useState, type ReactNode } from "react";
import { View, Platform } from "react-native";
import { useSession } from "./SessionProvider";
import { ApiError } from "@/shared/api/client";
import { ApiState } from "@/shared/ui/ApiState";
import { Txt } from "@/shared/ui/Txt";
import { Button } from "@/shared/ui/Button";
export function AccountGate({ children }: { children: ReactNode }) {
  const auth = useSession(),
    [error, setError] = useState("");
  if (auth.pending) return <ApiState pending retry={auth.retry} />;
  if (auth.session) return <>{children}</>;
  return (
    <View style={{ gap: 12 }}>
      <Txt>Sign in with Steam to access your account data.</Txt>
      {Platform.OS !== "web" && (
        <Txt muted>Steam sign-in on mobile requires a development build.</Txt>
      )}
      {auth.error &&
        !(auth.error instanceof ApiError && auth.error.status === 401) && (
          <ApiState error={auth.error} retry={auth.retry} />
        )}
      <Button
        onPress={() => {
          if (!auth.busy) void auth.signIn().catch((e) => setError(e.message));
        }}
      >
        {auth.busy ? "Opening Steam…" : "Sign in with Steam"}
      </Button>
      {!!error && <Txt>{error}</Txt>}
    </View>
  );
}
