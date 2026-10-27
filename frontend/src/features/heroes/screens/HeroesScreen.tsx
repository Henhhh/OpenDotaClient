import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { useHeroList } from "../api/queries";
import { ApiState, RemoteImage } from "@/shared/ui/ApiState";
import { C, s } from "@/shared/theme/theme";
import { Txt } from "@/shared/ui/Txt";
import { Choices } from "@/shared/ui/Choices";
import { Button } from "@/shared/ui/Button";
import { Empty } from "@/shared/ui/Empty";
import { go } from "@/shared/navigation/navigation";
import { useAppState } from "@/shared/state/AppState";
export function Heroes({ grid = true }: { grid?: boolean }) {
  const [q, setQ] = useState(""),
    [attr, setAttr] = useState("All"),
    [role, setRole] = useState("All roles"),
    [fav, setFav] = useState(false);
  const { state } = useAppState();
  const attrs: Record<string, string> = {
    STR: "str",
    AGI: "agi",
    INT: "int",
    Uni: "all",
  };
  const query = useHeroList({
    q: q.trim() || undefined,
    primary_attr: attrs[attr],
    role: role === "All roles" ? undefined : role,
  });
  const rows =
    query.data?.pages
      .flatMap((p) => p.data.items)
      .filter((h) => !fav || state.heroes.includes(Number(h.hero_id))) ?? [];
  return (
    <View style={{ gap: 12 }}>
      <TextInput
        accessibilityLabel="Search heroes"
        value={q}
        onChangeText={setQ}
        placeholder="Search heroes"
        placeholderTextColor={C.subtle}
        style={[s.input, { flex: undefined }]}
      />
      <Choices
        items={["All", "STR", "AGI", "INT", "Uni"]}
        value={attr}
        onChange={setAttr}
      />
      <Choices
        items={[
          "All roles",
          "Carry",
          "Support",
          "Nuker",
          "Disabler",
          "Initiator",
          "Durable",
          "Escape",
          "Pusher",
        ]}
        value={role}
        onChange={setRole}
      />
      <Button onPress={() => setFav(!fav)}>
        {fav ? "Show all heroes" : "Favorite heroes only"}
      </Button>
      <Txt bold>
        {fav
          ? rows.length + " favorites loaded"
          : (query.data?.pages[0]?.data.total ?? 0) + " heroes"}
      </Txt>
      <ApiState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {!query.isPending && !query.error && !rows.length && (
        <Empty
          text={
            fav && query.hasNextPage
              ? "No favorites loaded yet. Load more to continue."
              : "No heroes found"
          }
        />
      )}
      <View style={grid ? s.wrap : { gap: 8 }}>
        {rows.map((h) => (
          <Pressable
            key={h.hero_id}
            accessibilityLabel={h.name}
            onPress={() => go("hero", { id: h.hero_id })}
            style={{
              width: grid ? "31.5%" : "100%",
              backgroundColor: C.card,
              borderRadius: 12,
              padding: 6,
              gap: 5,
            }}
          >
            <RemoteImage
              uri={h.image_url}
              width={grid ? 72 : 84}
              height={grid ? 58 : 48}
            />
            <Txt bold>{h.name}</Txt>
            {!grid && (
              <Txt muted size={11}>
                {h.primary_attr.toUpperCase()} · {h.attack_type} ·{" "}
                {h.roles.join(", ")}
              </Txt>
            )}
          </Pressable>
        ))}
      </View>
      {query.hasNextPage && (
        <Button
          onPress={() => {
            if (!query.isFetchingNextPage) void query.fetchNextPage();
          }}
        >
          {query.isFetchingNextPage ? "Loading…" : "Load more heroes"}
        </Button>
      )}
      <Txt muted size={10}>
        OpenDota · Meta statistics are available in hero details.
      </Txt>
    </View>
  );
}
