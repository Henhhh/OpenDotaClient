import { useState, useEffect } from "react";
import { Pressable, TextInput, View } from "react-native";
import { useApi } from "@/features/heroes/api/queries";
import type { SearchResults } from "@/shared/api/client";
import { ApiState, RemoteImage } from "@/shared/ui/ApiState";
import { C, s } from "@/shared/theme/theme";
import { Txt } from "@/shared/ui/Txt";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Choices } from "@/shared/ui/Choices";
import { Notice } from "@/shared/ui/Notice";
import { Empty } from "@/shared/ui/Empty";
import { useAppState } from "@/shared/state/AppState";
import { go } from "@/shared/navigation/navigation";
export function Search() {
  const [q, setQ] = useState(""),
    [debounced, setDebounced] = useState(""),
    [category, setCategory] = useState("All");
  const { state, set } = useAppState();
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(q.trim()), 400);
    return () => clearTimeout(timer);
  }, [q]);
  const types: Record<string, string> = {
    All: "all",
    Players: "player",
    Heroes: "hero",
    Teams: "team",
    "Match IDs": "match",
  };
  const valid = [...debounced].length >= 2 && [...debounced].length <= 80;
  const query = useApi<SearchResults>(
    "/search",
    { q: debounced, type: types[category], limit: 10 },
    valid,
  );
  const current = debounced === q.trim();
  const result = current && valid ? query.data?.data : undefined;
  const open = (name: string, id: string) => {
    set((s) => ({
      ...s,
      history: [q.trim(), ...s.history.filter((v) => v !== q.trim())].slice(
        0,
        8,
      ),
    }));
    go(name, { id });
  };
  const empty =
    result &&
    !result.players.length &&
    !result.heroes.length &&
    !result.teams.length &&
    !result.match;
  return (
    <View style={{ gap: 12 }}>
      <TextInput
        accessibilityLabel="Search"
        value={q}
        onChangeText={setQ}
        placeholder="Search players, heroes, teams or match IDs"
        placeholderTextColor={C.subtle}
        style={[s.input, { flex: undefined }]}
      />
      <Choices
        items={Object.keys(types)}
        value={category}
        onChange={setCategory}
      />
      {!q.trim() ? (
        <>
          <View style={s.between}>
            <Txt bold>Recent searches</Txt>
            <Button onPress={() => set((s) => ({ ...s, history: [] }))}>
              Clear all
            </Button>
          </View>
          {state.history.map((term) => (
            <Button key={term} onPress={() => setQ(term)}>
              {term}
            </Button>
          ))}
        </>
      ) : (
        <>
          {(!valid || !current) && (
            <Txt muted>
              {[...q.trim()].length < 2
                ? "Enter at least 2 characters."
                : [...q.trim()].length > 80
                  ? "Use at most 80 characters."
                  : "Searching…"}
            </Txt>
          )}
          {current && valid && (
            <ApiState
              pending={query.isPending}
              error={query.error}
              retry={() => void query.refetch()}
            />
          )}
          {result?.match && (
            <>
              <Button
                primary
                onPress={() => open("match", result.match!.match_id)}
              >
                Open match {result.match.match_id}
              </Button>
              <Txt muted>
                Match ID suggestion only; existence has not been verified.
              </Txt>
            </>
          )}
          {result?.heroes.map((h) => (
            <Pressable key={h.hero_id} onPress={() => open("hero", h.hero_id)}>
              <Card>
                <View style={s.row}>
                  <RemoteImage uri={h.image_url} />
                  <Txt bold>{h.name}</Txt>
                </View>
              </Card>
            </Pressable>
          ))}
          {result?.players.map((p) => (
            <Pressable
              key={p.account_id}
              onPress={() => open("player", p.account_id)}
            >
              <Card>
                <View style={s.row}>
                  <RemoteImage uri={p.avatar_url} />
                  <Txt bold>{p.name ?? p.account_id}</Txt>
                </View>
              </Card>
            </Pressable>
          ))}
          {result?.teams.map((t) => (
            <Pressable key={t.team_id} onPress={() => open("team", t.team_id)}>
              <Card>
                <View style={s.row}>
                  <RemoteImage uri={t.logo_url} />
                  <Txt bold>{t.name}</Txt>
                </View>
              </Card>
            </Pressable>
          ))}
          {empty && <Empty text="No results found" />}
        </>
      )}
      <Notice>
        Search and detail screens use backend API data. Private or unavailable
        profiles may not provide match statistics.
      </Notice>
    </View>
  );
}
