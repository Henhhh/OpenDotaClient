import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Platform } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import {
  apiRequest,
  ApiError,
  type Session,
  type LoginStart,
  type NativeSession,
} from "@/shared/api/client";
import { readFlow, writeFlow, writeToken } from "@/shared/auth/storage";
type Auth = {
  session: Session | null;
  pending: boolean;
  error: Error | null;
  busy: boolean;
  signIn: () => Promise<void>;
  finish: (code: string, state: string) => Promise<void>;
  logout: () => Promise<void>;
  retry: () => void;
};
const Context = createContext<Auth | null>(null);
// AuthSession and the cold-start callback can deliver the same URL. Share its exchange.
const exchanges = new Map<string, Promise<void>>();
export function SessionProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const query = useQuery({
    queryKey: ["session"],
    queryFn: ({ signal }) => apiRequest<Session>("/auth/session", { signal }),
    retry: false,
    staleTime: 60000,
  });
  const session = query.isError ? null : (query.data?.data ?? null);
  useEffect(() => {
    if (query.error instanceof ApiError && query.error.status === 401) {
      void writeToken(null);
      void client
        .cancelQueries({ queryKey: ["account"] })
        .then(() => client.removeQueries({ queryKey: ["account"] }));
    }
  }, [query.error, client]);
  const finish = useCallback(
    async (code: string, state: string) => {
      if (exchanges.has(code)) return exchanges.get(code)!;
      const exchange = (async () => {
        const raw = await readFlow();
        const saved = raw ? JSON.parse(raw) : null;
        if (
          !saved ||
          saved.state !== state ||
          Date.now() > Date.parse(saved.expires_at)
        )
          throw new Error(
            "Steam sign-in state is missing or expired. Start sign-in again.",
          );
        const response = await apiRequest<Session | NativeSession>(
          "/auth/exchange",
          { method: "POST", body: { code, state } },
        );
        let authenticated: Session;
        if ("access_token" in response.data) {
          await writeToken(response.data.access_token);
          authenticated = response.data.session;
        } else authenticated = response.data;
        await writeFlow(null);
        await client.cancelQueries({ queryKey: ["account"] });
        client.removeQueries({ queryKey: ["account"] });
        await client.cancelQueries({ queryKey: ["session"] });
        client.setQueryData(["session"], { ...response, data: authenticated });
      })();
      exchanges.set(code, exchange);
      try {
        await exchange;
      } catch (error) {
        exchanges.delete(code);
        throw error;
      } finally {
        setTimeout(() => exchanges.delete(code), 60000);
      }
    },
    [client],
  );
  const signIn = useCallback(async () => {
    setBusy(true);
    try {
      const redirect_uri =
        Platform.OS === "web"
          ? `${window.location.origin}/auth/callback`
          : (process.env.EXPO_PUBLIC_AUTH_REDIRECT_URI ??
            "opendota://auth/callback");
      const response = await apiRequest<LoginStart>("/auth/steam/start", {
        method: "POST",
        body: {
          redirect_uri,
          platform: Platform.OS === "web" ? "web" : "native",
        },
      });
      const url = new URL(response.data.authorization_url);
      if (url.origin !== "https://steamcommunity.com")
        throw new Error("Invalid Steam authorization URL");
      await writeFlow(
        JSON.stringify({
          state: response.data.state,
          expires_at: response.data.expires_at,
        }),
      );
      if (Platform.OS === "web") {
        window.location.assign(url.href);
        return;
      }
      const result = await WebBrowser.openAuthSessionAsync(
        url.href,
        redirect_uri,
      );
      if (result.type === "success") {
        const callback = new URL(result.url);
        if (
          callback.protocol !== new URL(redirect_uri).protocol ||
          callback.host !== new URL(redirect_uri).host ||
          callback.pathname !== new URL(redirect_uri).pathname
        )
          throw new Error("Unexpected sign-in callback");
        await finish(
          callback.searchParams.get("code") ?? "",
          callback.searchParams.get("state") ?? "",
        );
      } else await writeFlow(null);
    } finally {
      setBusy(false);
    }
  }, [finish]);
  const logout = useCallback(async () => {
    setBusy(true);
    try {
      await apiRequest<void>("/auth/logout", { method: "POST", body: {} });
      await writeToken(null);
      await writeFlow(null);
      await client.cancelQueries({ queryKey: ["account"] });
      client.removeQueries({ queryKey: ["account"] });
      client.setQueryData(["session"], null);
    } finally {
      setBusy(false);
    }
  }, [client]);
  return (
    <Context.Provider
      value={{
        session,
        pending: query.isPending,
        error: query.error,
        busy,
        signIn,
        finish,
        logout,
        retry: () => void query.refetch(),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useSession() {
  const auth = useContext(Context);
  if (!auth) throw new Error("SessionProvider required");
  return auth;
}
