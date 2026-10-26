import { useState } from "react";
import { Pressable, Text, TextInput, View, Switch } from "react-native";
import { getHero } from "@/features/heroes/data/heroes";
import { playerMatches, isWin } from "@/features/matches/data/matches";
import { ME_ID } from "@/features/players/data/players";
import { fmtPct, kdaRatio } from "@/shared/utils/format";
import {
  applyMatchFilters,
  DEFAULT,
  dayLabel,
  type Filters,
} from "@/features/matches/logic/matchFilters";
import { C, s } from "@/shared/theme/theme";
import { Art } from "@/shared/ui/Art";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Choices } from "@/shared/ui/Choices";
import { Empty } from "@/shared/ui/Empty";
import { Sheet } from "@/shared/ui/Sheet";
import { SortMenu } from "@/shared/ui/SortMenu";
import { Txt } from "@/shared/ui/Txt";
import { go } from "@/shared/navigation/navigation";
import { MatchRow } from "@/features/matches/components/MatchRow";

export function Matches({
  accountId = ME_ID,
  filterOpen = false,
  onFilterClose = () => {},
}: {
  accountId?: number;
  filterOpen?: boolean;
  onFilterClose?: () => void;
}) {
  const [filters, setFilters] = useState<Filters>(DEFAULT),
    [draft, setDraft] = useState<Filters>(DEFAULT),
    [open, setOpen] = useState(false),
    [sort, setSort] = useState("Most recent"),
    [count, setCount] = useState(15),
    [lookup, setLookup] = useState(""),
    [error, setError] = useState("");
  const [lastExternalOpen, setLastExternalOpen] = useState(filterOpen);
  if (lastExternalOpen !== filterOpen) {
    setLastExternalOpen(filterOpen);
    if (filterOpen) setDraft(filters);
  }
  const all = playerMatches(accountId),
    rows = applyMatchFilters(all, filters).sort((a, b) =>
      sort === "Best KDA"
        ? kdaRatio(b.kills, b.deaths, b.assists) -
          kdaRatio(a.kills, a.deaths, a.assists)
        : sort === "Highest GPM"
          ? b.gold_per_min - a.gold_per_min
          : sort === "Longest duration"
            ? b.duration - a.duration
            : b.start_time - a.start_time,
    );
  const wins = rows.filter(isWin).length;
  const update = (patch: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setCount(15);
  };
  const close = () => {
    setOpen(false);
    onFilterClose();
  };
  const visible = open || filterOpen;
  return (
    <View style={{ gap: 10 }}>
      <View style={s.row}>
        <TextInput
          accessibilityLabel="Match ID"
          placeholder="#  Look up a match ID"
          placeholderTextColor={C.subtle}
          keyboardType="number-pad"
          value={lookup}
          onChangeText={setLookup}
          style={s.input}
        />
        <Button
          onPress={() => {
            if (
              !/^\d+$/.test(lookup) ||
              !Number.isSafeInteger(Number(lookup)) ||
              Number(lookup) <= 0
            ) {
              setError("Enter a valid numeric match ID.");
              return;
            }
            setError("");
            go("match", { id: lookup });
          }}
        >
          Open
        </Button>
      </View>
      {!!error && <Txt color={C.loss}>{error}</Txt>}
      <Choices
        items={["All modes", "Ranked", "Unranked", "Turbo"]}
        value={
          {
            all: "All modes",
            ranked: "Ranked",
            unranked: "Unranked",
            turbo: "Turbo",
          }[filters.mode]
        }
        onChange={(v) =>
          update({
            mode: (
              {
                "All modes": "all",
                Ranked: "ranked",
                Unranked: "unranked",
                Turbo: "turbo",
              } as const
            )[v as "Ranked"],
          })
        }
      />
      <View style={s.between}>
        <Button
          onPress={() => {
            setDraft(filters);
            setOpen(true);
          }}
        >
          ☷ Filters
        </Button>
        <SortMenu
          items={["Most recent", "Best KDA", "Highest GPM", "Longest duration"]}
          value={sort}
          onChange={setSort}
        />
      </View>
      <Card>
        <View style={s.between}>
          <View>
            <Txt bold color={C.win}>
              {wins}W{" "}
              <Text style={{ color: C.loss }}>– {rows.length - wins}L</Text>
            </Txt>
            <Txt muted>{rows.length} matches shown</Txt>
          </View>
          <Txt bold>
            {fmtPct(wins / Math.max(1, rows.length))}{" "}
            {rows.length
              ? (
                  rows.reduce(
                    (a, m) => a + kdaRatio(m.kills, m.deaths, m.assists),
                    0,
                  ) / rows.length
                ).toFixed(2)
              : "0.00"}
          </Txt>
        </View>
      </Card>
      <Badge />
      {!rows.length && <Empty />}
      {rows.slice(0, count).map((m, i) => (
        <View key={m.match_id}>
          {(i === 0 ||
            dayLabel(m.start_time) !== dayLabel(rows[i - 1].start_time)) && (
            <Text style={[s.label, { color: C.subtle, marginVertical: 12 }]}>
              {dayLabel(m.start_time).toUpperCase()}
            </Text>
          )}
          <MatchRow m={m} />
        </View>
      ))}
      {count < rows.length && (
        <Button onPress={() => setCount((c) => c + 15)}>
          Load more ({rows.length - count} remaining)
        </Button>
      )}
      <Sheet
        visible={visible}
        onClose={close}
        title="Filter matches"
        footer={
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Button onPress={() => setDraft(DEFAULT)}>Reset</Button>
            </View>
            <View style={{ flex: 2 }}>
              <Button
                primary
                onPress={() => {
                  setFilters(draft);
                  setCount(15);
                  close();
                }}
              >
                Show {applyMatchFilters(all, draft).length} matches
              </Button>
            </View>
          </View>
        }
      >
        <Txt muted>Filter match history</Txt>
        <Text style={s.label}>RESULT</Text>
        <Choices
          segmented
          items={["All", "Wins", "Losses"]}
          value={{ all: "All", win: "Wins", loss: "Losses" }[draft.result]}
          onChange={(v) =>
            setDraft((d) => ({
              ...d,
              result: v === "Wins" ? "win" : v === "Losses" ? "loss" : "all",
            }))
          }
        />
        <Text style={s.label}>DATE RANGE</Text>
        <Choices
          segmented
          items={["All", "30 days", "7 days"]}
          value={draft.range === "all" ? "All" : draft.range + " days"}
          onChange={(v) =>
            setDraft((d) => ({
              ...d,
              range: v === "All" ? "all" : v === "30 days" ? "30" : "7",
            }))
          }
        />
        <Text style={s.label}>HERO</Text>
        <View style={s.wrap}>
          {[null, ...new Set(all.map((m) => m.hero_id))].map((id) => (
            <Pressable
              key={id ?? "any"}
              onPress={() => setDraft((d) => ({ ...d, hero: id }))}
              style={[
                s.row,
                {
                  backgroundColor: draft.hero === id ? "#40252a" : C.raised,
                  padding: 10,
                  borderRadius: 22,
                },
              ]}
            >
              {id && <Art hero={getHero(id).key} width={22} height={22} />}
              <Txt size={11}>{id ? getHero(id).name : "Any hero"}</Txt>
            </Pressable>
          ))}
        </View>
        <Text style={s.label}>LANE</Text>
        <Choices
          items={["Any", "Safe lane", "Mid lane", "Off lane"]}
          value={["Any", "Safe lane", "Mid lane", "Off lane"][draft.lane ?? 0]}
          onChange={(v) =>
            setDraft((d) => ({
              ...d,
              lane:
                ["Any", "Safe lane", "Mid lane", "Off lane"].indexOf(v) || null,
            }))
          }
        />
        <Text style={s.label}>PARTY</Text>
        <Choices
          segmented
          items={["Any", "Solo", "Party"]}
          value={draft.party[0].toUpperCase() + draft.party.slice(1)}
          onChange={(v) =>
            setDraft((d) => ({
              ...d,
              party: v.toLowerCase() as Filters["party"],
            }))
          }
        />
        <View style={s.between}>
          <Txt bold>Parsed matches only</Txt>
          <Switch
            value={draft.parsedOnly}
            onValueChange={(v) => setDraft((d) => ({ ...d, parsedOnly: v }))}
          />
        </View>
      </Sheet>
    </View>
  );
}
