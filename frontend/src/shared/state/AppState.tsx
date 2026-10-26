import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type State = {
  heroes: number[];
  players: number[];
  teams: number[];
  history: string[];
  read: string[];
  parsed: number[];
};

const initial: State = {
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
                Array.isArray(p[k]) ? p[k] : v,
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

export function useFavorite(kind: "heroes" | "players" | "teams", id: number) {
  const { state, set } = useAppState();
  return [
    state[kind].includes(id),
    () =>
      set((s) => ({
        ...s,
        [kind]: s[kind].includes(id)
          ? s[kind].filter((n) => n !== id)
          : [...s[kind], id],
      })),
  ] as const;
}
