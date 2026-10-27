import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSession } from "@/features/auth/SessionProvider";
import {
  useFavorites,
  useAccountMutation,
  setFavorite,
} from "@/features/account/api";
import type { FavoriteKind } from "@/shared/api/client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type State = {
  account: string;
  heroes: number[];
  players: number[];
  teams: number[];
  history: string[];
  read: string[];
  parsed: number[];
};

const initial: State = {
  account: "311360822",
  heroes: [17, 39, 13],
  players: [311360822, 900111222],
  teams: [7119388],
  history: ["Yatoro", "Storm Spirit", "Team Spirit", "8312547001"],
  read: [],
  parsed: [],
};

const Context = createContext<{
  state: State;
  set: (fn: (s: State) => State) => void;
  ready: boolean;
}>({ state: initial, set: () => {}, ready: false });

export function AppState({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem("opendota-native-v1")
      .then((raw) => {
        if (raw && mounted) {
          const p = JSON.parse(raw);
          setState(
            Object.fromEntries(
              Object.entries(initial).map(([k, v]) => [
                k,
                k === "account"
                  ? typeof p[k] === "string" &&
                    /^[1-9]\d{0,9}$/.test(p[k]) &&
                    Number(p[k]) <= 4294967295
                    ? p[k]
                    : v
                  : Array.isArray(p[k])
                    ? p[k]
                    : v,
              ]),
            ) as State,
          );
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    if (ready)
      AsyncStorage.setItem("opendota-native-v1", JSON.stringify(state)).catch(
        () => {},
      );
  }, [ready, state]);
  return (
    <Context.Provider value={{ state, set: setState, ready }}>
      {children}
    </Context.Provider>
  );
}

export const useAppState = () => useContext(Context);

export function useFavorite(
  kind: "heroes" | "players" | "teams",
  id: number | string,
) {
  const { state, set } = useAppState();
  const { session } = useSession(),
    favorites = useFavorites();
  const singular: FavoriteKind =
    kind === "heroes" ? "hero" : kind === "players" ? "player" : "team";
  const saved = !!favorites.data?.some(
    (f) => f.kind === singular && f.entity_id === String(id),
  );
  const mutation = useAccountMutation(() =>
    setFavorite(singular, String(id), saved),
  );
  return [
    session ? saved : state[kind].includes(Number(id)),
    () => {
      if (session) {
        if (!favorites.isPending && !favorites.error && !mutation.isPending)
          mutation.mutate(undefined);
        return;
      }
      if (!Number.isSafeInteger(Number(id))) return;
      set((s) => ({
        ...s,
        [kind]: s[kind].includes(Number(id))
          ? s[kind].filter((n) => n !== Number(id))
          : [...s[kind], Number(id)],
      }));
    },
    {
      error: mutation.error ?? favorites.error,
      pending: session ? favorites.isPending || mutation.isPending : false,
    },
  ] as const;
}
