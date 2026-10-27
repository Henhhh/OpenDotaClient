import { useState } from "react";
import { TextInput, View } from "react-native";
import type { PlayerMatch, PlayerHero, Page } from "@/shared/api/client";
import {
  usePlayerApi,
  usePlayerPages,
  validId,
  validAccount,
} from "@/features/players/api/queries";
import {
  AccountPicker,
  useViewedAccount,
} from "@/features/players/components/AccountPicker";
import { ApiState } from "@/shared/ui/ApiState";
import { Button } from "@/shared/ui/Button";
import { Choices } from "@/shared/ui/Choices";
import { Sheet } from "@/shared/ui/Sheet";
import { Notice } from "@/shared/ui/Notice";
import { Txt } from "@/shared/ui/Txt";
import { C, s } from "@/shared/theme/theme";
import { go } from "@/shared/navigation/navigation";
import { heroPresentation } from "@/features/heroes/data/presentation";
import { MatchRow } from "../components/MatchRow";
type Filters = { result: string; range: string; hero: string };
const defaults: Filters = { result: "All", range: "All", hero: "Any hero" };
export function Matches({
  accountId,
  filterOpen = false,
  onFilterClose = () => {},
}: {
  accountId?: string;
  filterOpen?: boolean;
  onFilterClose?: () => void;
}) {
  const selected = useViewedAccount(),
    id = accountId ?? selected;
  return (
    <View style={{ gap: 12 }}>
      {!accountId && <AccountPicker />}
      <MatchHistory
        key={id}
        id={id}
        filterOpen={filterOpen}
        onFilterClose={onFilterClose}
      />
    </View>
  );
}
function MatchHistory({
  id,
  filterOpen,
  onFilterClose,
}: {
  id: string;
  filterOpen: boolean;
  onFilterClose: () => void;
}) {
  const [mode, setMode] = useState("All modes"),
    [filters, setFilters] = useState(defaults),
    [draft, setDraft] = useState(defaults);
  const [open, setOpen] = useState(false),
    [lookup, setLookup] = useState(""),
    [error, setError] = useState("");
  const [previous, setPrevious] = useState(filterOpen);
  if (previous !== filterOpen) {
    setPrevious(filterOpen);
    if (filterOpen) setDraft(filters);
  }
  const [anchor] = useState(() => Math.floor(Date.now() / 1000));
  const params = {
    result:
      filters.result === "Wins"
        ? "win"
        : filters.result === "Losses"
          ? "loss"
          : undefined,
    from:
      filters.range === "All"
        ? undefined
        : anchor - Number(filters.range.split(" ")[0]) * 86400,
    hero_id: filters.hero === "Any hero" ? undefined : filters.hero,
    lobby_type: mode === "Ranked" ? 7 : mode === "Unranked" ? 0 : undefined,
    game_mode: mode === "Turbo" ? 23 : undefined,
  };
  const q = usePlayerPages<PlayerMatch>(
    `/players/${id}/matches`,
    params,
    validAccount(id),
  );
  const heroes = usePlayerApi<Page<PlayerHero>>(
    `/players/${id}/heroes`,
    { limit: 100 },
    validAccount(id),
  );
  const rows = q.data?.pages.flatMap((p) => p.data.items) ?? [];
  const total = q.data?.pages[0].data.total;
  const close = () => {
    setOpen(false);
    onFilterClose();
  };
  return (
    <View style={{ gap: 10 }}>
      <View style={s.row}>
        <TextInput
          accessibilityLabel="Match ID"
          value={lookup}
          onChangeText={setLookup}
          placeholder="# Look up a match ID"
          placeholderTextColor={C.subtle}
          keyboardType="number-pad"
          style={s.input}
        />
        <Button
          onPress={() => {
            const value = lookup.trim();
            if (!validId(value)) {
              setError("Enter a valid numeric match ID.");
              return;
            }
            setError("");
            go("match", { id: value });
          }}
        >
          Open
        </Button>
      </View>
      {!!error && <Txt color={C.loss}>{error}</Txt>}
      <Choices
        items={["All modes", "Ranked", "Unranked", "Turbo"]}
        value={mode}
        onChange={setMode}
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
        <Txt muted>Most recent</Txt>
      </View>
      <ApiState
        pending={q.isPending}
        error={q.error}
        retry={() => void q.refetch()}
      />
      {q.data && (
        <Txt muted>
          {total ?? rows.length} matches · {rows.length} loaded
        </Txt>
      )}
      {q.data && !rows.length && !q.error && (
        <Txt muted>No matches match these filters.</Txt>
      )}
      {rows.map((m) => (
        <MatchRow key={m.match_id} m={m} />
      ))}
      {q.hasNextPage && (
        <Button
          onPress={() => {
            if (!q.isFetchingNextPage) void q.fetchNextPage();
          }}
        >
          {q.isFetchingNextPage ? "Loading…" : "Load more matches"}
        </Button>
      )}
      <Sheet
        visible={open || filterOpen}
        onClose={close}
        title="Filter matches"
        footer={
          <View style={s.row}>
            <Button onPress={() => setDraft(defaults)}>Reset</Button>
            <Button
              primary
              onPress={() => {
                setFilters(draft);
                close();
              }}
            >
              Apply filters
            </Button>
          </View>
        }
      >
        <Txt muted>RESULT</Txt>
        <Choices
          segmented
          items={["All", "Wins", "Losses"]}
          value={draft.result}
          onChange={(result) => setDraft((d) => ({ ...d, result }))}
        />
        <Txt muted>DATE RANGE</Txt>
        <Choices
          segmented
          items={["All", "30 days", "7 days"]}
          value={draft.range}
          onChange={(range) => setDraft((d) => ({ ...d, range }))}
        />
        <Txt muted>HERO</Txt>
        <Choices
          items={[
            "Any hero",
            ...(heroes.data?.data.items ?? []).map((h) => h.hero_id),
          ]}
          value={draft.hero}
          label={(v) => (v === "Any hero" ? v : heroPresentation(v).name)}
          onChange={(hero) => setDraft((d) => ({ ...d, hero }))}
        />
        <ApiState
          pending={heroes.isPending}
          error={heroes.error}
          retry={() => void heroes.refetch()}
        />
        <Notice>
          Lane, party, parsed-only filters and alternate sorting are not
          available in API v1. Unranked selects lobby type 0.
        </Notice>
      </Sheet>
    </View>
  );
}
