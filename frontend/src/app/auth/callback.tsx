import { useEffect, useRef, useState } from "react";
import { Platform, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSession } from "@/features/auth/SessionProvider";
import { Txt } from "@/shared/ui/Txt";
import { Button } from "@/shared/ui/Button";
export default function SteamCallback() {
  const { code, state } = useLocalSearchParams<{
    code?: string;
    state?: string;
  }>();
  const { finish } = useSession(),
    started = useRef(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const capturedCode = code ?? "",
      capturedState = state ?? "";
    if (Platform.OS === "web")
      window.history.replaceState(null, "", "/auth/callback");
    void finish(capturedCode, capturedState)
      .then(() => router.replace("/settings" as never))
      .catch((e) => setError(e.message));
  }, [code, state, finish]);
  return (
    <View style={{ padding: 24, gap: 16 }}>
      <Txt bold>
        {error ? "Steam sign-in failed" : "Completing Steam sign-in…"}
      </Txt>
      {!!error && (
        <>
          <Txt>{error}</Txt>
          <Button onPress={() => router.replace("/settings" as never)}>
            Back to account
          </Button>
        </>
      )}
    </View>
  );
}
