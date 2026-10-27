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
import {
  apiRequest,
  ApiError,
  type Session,
  type NativeSession,
} from "@/shared/api/client";
import { writeToken } from "@/shared/auth/storage";
type Credentials = { email: string; password: string; name?: string };
type Auth = {
  session: Session | null;
  pending: boolean;
  error: Error | null;
  busy: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  setCredentials: (
    email: string,
    password: string,
    name: string,
  ) => Promise<void>;
  setDotaAccount: (id: string) => Promise<void>;
  logout: () => Promise<void>;
  retry: () => void;
};
const Context = createContext<Auth | null>(null);
export function SessionProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient(),
    [busy, setBusy] = useState(false);
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
  const authenticate = useCallback(
    async (
      action: "login" | "register" | "credentials",
      payload: Credentials,
    ) => {
      setBusy(true);
      try {
        await client.cancelQueries({ queryKey: ["session"] });
        const r = await apiRequest<Session | NativeSession>("/auth/" + action, {
          method: "POST",
          body: {
            ...payload,
            ...(action === "credentials"
              ? {}
              : { platform: Platform.OS === "web" ? "web" : "native" }),
          },
        });
        let authenticated: Session;
        if ("access_token" in r.data) {
          await writeToken(r.data.access_token);
          authenticated = r.data.session;
        } else authenticated = r.data;
        await client.cancelQueries({ queryKey: ["account"] });
        client.removeQueries({ queryKey: ["account"] });
        client.setQueryData(["session"], { ...r, data: authenticated });
      } finally {
        setBusy(false);
      }
    },
    [client],
  );
  const signIn = useCallback(
    (email: string, password: string) =>
      authenticate("login", { email, password }),
    [authenticate],
  );
  const register = useCallback(
    (email: string, password: string, name: string) =>
      authenticate("register", { email, password, name }),
    [authenticate],
  );
  const setCredentials = useCallback(
    (email: string, password: string, name: string) =>
      authenticate("credentials", { email, password, name }),
    [authenticate],
  );
  const setDotaAccount = useCallback(
    async (id: string) => {
      const r = await apiRequest<Session>("/auth/profile", {
        method: "PATCH",
        body: { dota_account_id: id },
      });
      client.setQueryData(["session"], r);
    },
    [client],
  );
  const logout = useCallback(async () => {
    setBusy(true);
    try {
      await apiRequest<void>("/auth/logout", { method: "POST", body: {} });
      await writeToken(null);
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
        register,
        setCredentials,
        setDotaAccount,
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
