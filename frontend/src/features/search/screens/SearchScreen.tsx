import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { searchAll, TRENDING } from "@/features/search/data/search";
import { HEROES } from "@/features/heroes/data/heroes";
import { PLAYERS } from "@/features/players/data/players";
import { C, s } from "@/shared/theme/theme";
import { Art } from "@/shared/ui/Art";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Choices } from "@/shared/ui/Choices";
import { Empty } from "@/shared/ui/Empty";
import { IconButton } from "@/shared/ui/IconButton";
import { Notice } from "@/shared/ui/Notice";
import { Section } from "@/shared/ui/Section";
import { Txt } from "@/shared/ui/Txt";
import { useAppState } from "@/shared/state/AppState";
import { go } from "@/shared/navigation/navigation";

export function Search() {
  const [q, setQ] = useState(""),
    [category, setCategory] = useState("All");
  const { state, set } = useAppState();
  const results = searchAll(q);
  const save = () => {
    if (q.trim())
      set((s) => ({
        ...s,
        history: [q.trim(), ...s.history.filter((x) => x !== q.trim())].slice(
          0,
          8,
        ),
      }));
  };
  const open = (name: string, id: number) => {
    save();
    go(name, { id });
  };
  const show = (x: string) => category === "All" || category === x;
  return (
    <View style={{ gap: 12 }}>
      <TextInput
        autoFocus
        accessibilityLabel="Search"
        style={[s.input, { flex: undefined }]}
        placeholder="Search players, heroes, teams or match IDs"
        placeholderTextColor={C.subtle}
        value={q}
        onChangeText={setQ}
        onSubmitEditing={() => {
          save();
          if (results.matchId) open("match", results.matchId);
        }}
      />
      <Choices
        items={["All", "Players", "Heroes", "Teams", "Match IDs"]}
        value={category}
        onChange={setCategory}
      />
      {!q.trim() ? (
        <>
          <Section
            title="Recent searches"
            action="Clear all"
            onPress={() => set((s) => ({ ...s, history: [] }))}
          />
          <Card>
            {state.history.length ? (
              state.history.map((term) => (
                <View key={term} style={s.between}>
                  <Pressable
                    onPress={() => setQ(term)}
                    style={{ flex: 1, padding: 10 }}
                  >
                    <Txt>{term}</Txt>
                  </Pressable>
                  <IconButton
                    name="close"
                    label={`Remove ${term}`}
                    onPress={() =>
                      set((s) => ({
                        ...s,
                        history: s.history.filter((x) => x !== term),
                      }))
                    }
                  />
                </View>
              ))
            ) : (
              <Txt muted>No recent searches</Txt>
            )}
          </Card>
          <Section title="Trending searches" />
          <View style={s.wrap}>
            {TRENDING.map((term) => (
              <Button key={term} onPress={() => setQ(term)}>
                ↗ {term}
              </Button>
            ))}
          </View>
          <Section title="Recent players" />
          <View style={s.wrap}>
            {PLAYERS.slice(0, 4).map((p) => (
              <Pressable
                key={p.account_id}
                onPress={() => open("player", p.account_id)}
                style={{ alignItems: "center", gap: 5 }}
              >
                <Art hero={p.avatarHero} width={56} height={56} />
                <Txt size={11}>{p.name}</Txt>
              </Pressable>
            ))}
          </View>
          <Section title="Popular heroes" />
          <View style={s.wrap}>
            {HEROES.slice(0, 6).map((h) => (
              <Button key={h.id} onPress={() => open("hero", h.id)}>
                {h.name}
              </Button>
            ))}
          </View>
          <Notice>
            Paste a numeric match ID to open match details. Search currently
            uses bundled sample profiles.
          </Notice>
        </>
      ) : (
        <>
          <Badge />
          {show("Match IDs") && results.matchId && (
            <Button primary onPress={() => open("match", results.matchId!)}>
              Open match {results.matchId}
            </Button>
          )}
          {show("Players") &&
            results.players.map((p) => (
              <Pressable
                key={p.account_id}
                onPress={() => open("player", p.account_id)}
              >
                <Card>
                  <View style={s.row}>
                    <Art hero={p.avatarHero} />
                    <Txt bold>{p.name}</Txt>
                  </View>
                </Card>
              </Pressable>
            ))}
          {show("Heroes") &&
            results.heroes.map((h) => (
              <Pressable key={h.id} onPress={() => open("hero", h.id)}>
                <Card>
                  <View style={s.row}>
                    <Art hero={h.key} />
                    <Txt bold>{h.name}</Txt>
                  </View>
                </Card>
              </Pressable>
            ))}
          {show("Teams") &&
            results.teams.map((t) => (
              <Button key={t.team_id} onPress={() => open("team", t.team_id)}>
                {t.name}
              </Button>
            ))}
          {show("Teams") &&
            results.leagues.map((l) => (
              <Button
                key={l.leagueid}
                onPress={() => open("league", l.leagueid)}
              >
                {l.name}
              </Button>
            ))}
          {!(
            (show("Players") && results.players.length) ||
            (show("Heroes") && results.heroes.length) ||
            (show("Teams") && results.teams.length + results.leagues.length) ||
            (show("Match IDs") && results.matchId)
          ) && <Empty />}
        </>
      )}
    </View>
  );
}
