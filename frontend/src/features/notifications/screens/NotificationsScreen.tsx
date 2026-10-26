import { useState } from "react";
import { Pressable, View } from "react-native";
import { NOTIFICATIONS } from "@/features/notifications/data/notifications";
import { getHero } from "@/features/heroes/data/heroes";
import { relTime } from "@/shared/utils/format";
import { dayLabel } from "@/features/matches/logic/matchFilters";
import { C, s } from "@/shared/theme/theme";
import { Art } from "@/shared/ui/Art";
import { Card } from "@/shared/ui/Card";
import { Choices } from "@/shared/ui/Choices";
import { Empty } from "@/shared/ui/Empty";
import { IconButton } from "@/shared/ui/IconButton";
import { Notice } from "@/shared/ui/Notice";
import { Section } from "@/shared/ui/Section";
import { Txt } from "@/shared/ui/Txt";
import { useAppState } from "@/shared/state/AppState";
import { openRoute } from "@/shared/navigation/navigation";

export function Notifications() {
  const { state, set } = useAppState();
  const [kind, setKind] = useState("All");
  const kinds: Record<string, string> = {
    "My matches": "match",
    Favorites: "favorite",
    Pro: "pro",
    Tournaments: "tournament",
    System: "system",
  };
  const rows = NOTIFICATIONS.filter(
    (n) =>
      kind === "All" ||
      (kind === "Unread" && !state.read.includes(n.id)) ||
      n.kind === kinds[kind],
  );
  return (
    <View style={{ gap: 12 }}>
      <View style={s.between}>
        <Txt muted>
          {NOTIFICATIONS.filter((n) => !state.read.includes(n.id)).length}{" "}
          unread
        </Txt>
        <IconButton
          name="check"
          label="Mark all read"
          onPress={() =>
            set((s) => ({ ...s, read: NOTIFICATIONS.map((n) => n.id) }))
          }
        />
      </View>
      <Notice>
        In-app alerts only. Generated locally from sample data. Real push
        notifications need a backend service.
      </Notice>
      <Choices
        items={[
          "All",
          "Unread",
          "My matches",
          "Favorites",
          "Pro",
          "Tournaments",
          "System",
        ]}
        value={kind}
        onChange={setKind}
      />
      {!rows.length && <Empty text="All caught up" />}
      {rows.map((n, i) => (
        <View key={n.id}>
          {(i === 0 || dayLabel(n.time) !== dayLabel(rows[i - 1].time)) && (
            <Section title={dayLabel(n.time)} />
          )}
          <Pressable
            onPress={() => {
              set((s) => ({ ...s, read: [...new Set([...s.read, n.id])] }));
              if (n.route) openRoute(n.route);
            }}
          >
            <Card>
              <View style={s.row}>
                {n.heroId ? (
                  <Art hero={getHero(n.heroId).key} />
                ) : (
                  <Txt color={C.gold}>♜</Txt>
                )}
                <View style={{ flex: 1 }}>
                  <Txt bold>{n.title}</Txt>
                  <Txt muted>{n.body}</Txt>
                  <Txt muted size={10}>
                    {relTime(n.time)}
                  </Txt>
                </View>
                {!state.read.includes(n.id) && <Txt color={C.red}>⊙</Txt>}
              </View>
            </Card>
          </Pressable>
        </View>
      ))}
    </View>
  );
}
