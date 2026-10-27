import { ActivityIndicator, View, Image } from "react-native";
import { ApiError } from "@/shared/api/client";
import { Button } from "./Button";
import { Txt } from "./Txt";
import { C } from "@/shared/theme/theme";
export function ApiState({
  pending,
  error,
  retry,
}: {
  pending?: boolean;
  error?: Error | null;
  retry: () => void;
}) {
  if (pending)
    return (
      <View style={{ padding: 20, gap: 8 }}>
        <ActivityIndicator color={C.red} />
        <Txt muted>Loading data…</Txt>
      </View>
    );
  if (!error) return null;
  const message =
    error instanceof ApiError && error.status === 501
      ? "This feature is not enabled on the backend yet."
      : error instanceof ApiError && error.status === 404
        ? "No data found for this ID."
        : error.message;
  return (
    <View accessibilityRole="alert" style={{ gap: 8, padding: 12 }}>
      <Txt color={C.loss}>{message}</Txt>
      <Button onPress={retry}>Retry</Button>
    </View>
  );
}
export function RemoteImage({
  uri,
  width = 56,
  height = 40,
}: {
  uri: string | null;
  width?: number;
  height?: number;
}) {
  return uri ? (
    <Image
      source={{ uri }}
      style={{ width, height, borderRadius: 7, backgroundColor: C.raised }}
    />
  ) : (
    <View
      style={{
        width,
        height,
        borderRadius: 7,
        backgroundColor: C.raised,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Txt muted>—</Txt>
    </View>
  );
}
export const rate = (v: number | null | undefined) =>
  v == null ? "—" : `${(v * 100).toFixed(1)}%`;
export const numberText = (v: number | null | undefined) =>
  v == null ? "—" : String(v);
