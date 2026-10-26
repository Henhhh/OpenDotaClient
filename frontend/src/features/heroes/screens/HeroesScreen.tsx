import { heroSource } from "@/shared/assets/hero-art";
import { useState } from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";
import {
  HEROES,
  heroStats,
  ROLE_FILTERS,
  heroMatchesRole,
} from "@/features/heroes/data/heroes";
import { ATTR_LABEL } from "@/shared/utils/assets";
import { fmtPct } from "@/shared/utils/format";
import { C, s } from "@/shared/theme/theme";
import { Art } from "@/shared/ui/Art";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Choices } from "@/shared/ui/Choices";
import { Empty } from "@/shared/ui/Empty";
import { IconButton } from "@/shared/ui/IconButton";
import { Sheet } from "@/shared/ui/Sheet";
import { SortMenu } from "@/shared/ui/SortMenu";
import { Txt } from "@/shared/ui/Txt";
import { go } from "@/shared/navigation/navigation";
import { useAppState } from "@/shared/state/AppState";

export function Heroes({ grid = true }: { grid?: boolean }) {
  const [q, setQ] = useState(""),
    [attr, setAttr] = useState("All"),
    [role, setRole] = useState("All roles"),
    [sort, setSort] = useState("Name (A–Z)"),
    [fav, setFav] = useState(false),
    [filters, setFilters] = useState(false);
  const { state } = useAppState();
  const attrMap: Record<string, string> = {
    STR: "str",
    AGI: "agi",
    INT: "int",
    Uni: "all",
  };
  const rows = HEROES.filter(
    (h) =>
      h.name.toLowerCase().includes(q.toLowerCase()) &&
      (attr === "All" || h.attr === attrMap[attr]) &&
      (!fav || state.heroes.includes(h.id)) &&
      (role === "All roles" || heroMatchesRole(h, role)),
  ).sort((a, b) =>
    sort === "Win rate"
      ? heroStats(b.id).winRate - heroStats(a.id).winRate
      : sort === "Pick rate"
        ? heroStats(b.id).pickRate - heroStats(a.id).pickRate
        : a.name.localeCompare(b.name),
  );
  return (
    <View style={{ gap: 10 }}>
      <View style={s.row}>
        <TextInput
          accessibilityLabel="Search heroes"
          value={q}
          onChangeText={setQ}
          placeholder="Search heroes"
          placeholderTextColor={C.subtle}
          style={s.input}
        />
      </View>
      <Choices
        items={["All", "STR", "AGI", "INT", "Uni"]}
        value={attr}
        onChange={setAttr}
      />
      <View style={s.row}>
        <IconButton
          name="filter"
          label="Filter heroes"
          onPress={() => setFilters(true)}
        />
        <IconButton
          name="star"
          color={fav ? C.gold : C.muted}
          label="Favorite heroes only"
          onPress={() => setFav((f) => !f)}
        />
        <Choices
          items={["All roles", ...ROLE_FILTERS]}
          value={role}
          onChange={setRole}
        />
      </View>
      <View style={s.between}>
        <Txt bold>{rows.length} heroes</Txt>
        <SortMenu
          items={["Name (A–Z)", "Win rate", "Pick rate"]}
          value={sort}
          onChange={setSort}
        />
      </View>
      {!rows.length && <Empty />}
      <View style={grid ? s.wrap : { gap: 0 }}>
        {rows.map((h) =>
          grid ? (
            <Pressable
              accessibilityLabel={h.name}
              key={h.id}
              onPress={() => go("hero", { id: h.id })}
              style={{
                width: "31.5%",
                aspectRatio: 1.5,
                borderRadius: 12,
                overflow: "hidden",
                backgroundColor: C.card,
              }}
            >
              <Image
                source={heroSource(h.key)}
                style={{ width: "100%", height: "100%" }}
              />
              <View
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  backgroundColor: "#000b",
                  padding: 4,
                }}
              >
                <Text
                  numberOfLines={1}
                  style={{ color: C.text, fontSize: 10, fontWeight: "700" }}
                >
                  {h.name}
                </Text>
              </View>
            </Pressable>
          ) : (
            <Pressable
              key={h.id}
              onPress={() => go("hero", { id: h.id })}
              style={[
                s.row,
                s.divider,
                { backgroundColor: C.card, paddingHorizontal: 10 },
              ]}
            >
              <Art hero={h.key} />
              <View style={{ flex: 1 }}>
                <Txt bold>{h.name}</Txt>
                <Txt muted size={10}>
                  {ATTR_LABEL[h.attr]} · {h.attack} · {h.roles.join(", ")}
                </Txt>
              </View>
              <View>
                <Txt
                  bold
                  color={heroStats(h.id).winRate > 0.5 ? C.win : C.loss}
                >
                  {fmtPct(heroStats(h.id).winRate)}
                </Txt>
                <Txt muted size={10}>
                  {fmtPct(heroStats(h.id).pickRate)} pick
                </Txt>
              </View>
            </Pressable>
          ),
        )}
      </View>
      <Badge text="META STATS ARE SAMPLE DATA" />
      <Sheet
        visible={filters}
        onClose={() => setFilters(false)}
        title="Filter heroes"
      >
        <Txt muted>Choose an attribute and a role</Txt>
        <Choices
          items={["All", "STR", "AGI", "INT", "Uni"]}
          value={attr}
          onChange={setAttr}
        />
        <Choices
          items={["All roles", ...ROLE_FILTERS]}
          value={role}
          onChange={setRole}
        />
        <Button
          onPress={() => {
            setAttr("All");
            setRole("All roles");
            setFav(false);
          }}
        >
          Reset
        </Button>
        <Button primary onPress={() => setFilters(false)}>
          Show {rows.length} heroes
        </Button>
      </Sheet>
    </View>
  );
}
