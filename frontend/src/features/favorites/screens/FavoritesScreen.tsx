import { useState } from "react";
import { View, Pressable } from "react-native";
import { useSession } from "@/features/auth/SessionProvider";
import {
  useFavorites,
  useAccountMutation,
  setFavorite,
} from "@/features/account/api";
import { useAppState } from "@/shared/state/AppState";
import type { Favorite, FavoriteKind } from "@/shared/api/client";
import { usePro } from "@/features/pro-scene/api/queries";
import { Card } from "@/shared/ui/Card";
import { Choices } from "@/shared/ui/Choices";
import { Txt } from "@/shared/ui/Txt";
import { Button } from "@/shared/ui/Button";
import { Notice } from "@/shared/ui/Notice";
import { ApiState } from "@/shared/ui/ApiState";
import { go } from "@/shared/navigation/navigation";
function FavoriteRow({
  item,
  onRemove,
}: {
  item: Favorite;
  onRemove: () => void;
}) {
  const path =
    item.kind === "hero"
      ? `/heroes/${item.entity_id}`
      : item.kind === "team"
        ? `/pro/teams/${item.entity_id}`
        : null;
  const detail = usePro<{ name: string | null }>(path ?? "", !!path);
  return (
    <Card>
      <Pressable onPress={() => go(item.kind, { id: item.entity_id })}>
        <Txt bold>
          {detail.data?.data.name ?? `${item.kind} ${item.entity_id}`}
        </Txt>
      </Pressable>
      <Button onPress={onRemove}>Remove favorite</Button>
    </Card>
  );
}
export function Favorites() {
  const auth = useSession(),
    remote = useFavorites(),
    { state, set } = useAppState(),
    [kind, setKind] = useState("Heroes"),
    [message, setMessage] = useState("");
  const mutation = useAccountMutation(
    ({ kind, id }: { kind: FavoriteKind; id: string }) =>
      setFavorite(kind, id, true),
  );
  const key = kind.toLowerCase() as "heroes" | "players" | "teams",
    singular: FavoriteKind =
      key === "heroes" ? "hero" : key === "players" ? "player" : "team";
  const rows: Favorite[] = auth.session
    ? (remote.data ?? []).filter((f) => f.kind === singular)
    : state[key].map((id) => ({
        kind: singular,
        entity_id: String(id),
        created_at: "",
      }));
  const importer = useAccountMutation(async () => {
    for (const [key, kind] of [
      ["heroes", "hero"],
      ["players", "player"],
      ["teams", "team"],
    ] as const)
      for (const id of state[key]) await setFavorite(kind, String(id), false);
  });
  return (
    <View style={{ gap: 12 }}>
      <Choices
        items={["Heroes", "Players", "Teams"]}
        value={kind}
        onChange={setKind}
      />
      {auth.session ? (
        <>
          <Notice>
            Favorites saved to Steam account {auth.session.user.account_id}.
            Local favorites are kept separately.
          </Notice>
          <Button
            onPress={() => {
              if (!importer.isPending)
                importer.mutate(undefined, {
                  onSuccess: () =>
                    setMessage("Local favorites imported into your account."),
                });
            }}
          >
            {importer.isPending ? "Importing…" : "Import local favorites"}
          </Button>
          <ApiState
            pending={remote.isPending}
            error={remote.error}
            retry={() => void remote.refetch()}
          />
        </>
      ) : (
        <>
          <Notice>
            Favorites on this device. Sign in to save favorites to your account.
          </Notice>
          <Button onPress={() => go("settings")}>Account settings</Button>
        </>
      )}
      {!remote.isPending && auth.session && !remote.error && !rows.length && (
        <Txt>No favorites yet.</Txt>
      )}
      {!auth.session && !rows.length && <Txt>No local favorites yet.</Txt>}
      {rows.map((f) => (
        <FavoriteRow
          key={`${f.kind}:${f.entity_id}`}
          item={f}
          onRemove={() => {
            if (auth.session) {
              if (!mutation.isPending)
                mutation.mutate({ kind: f.kind, id: f.entity_id });
            } else
              set((s) => ({
                ...s,
                [key]: s[key].filter((id) => String(id) !== f.entity_id),
              }));
          }}
        />
      ))}
      {(mutation.error || importer.error) && (
        <Notice>{(mutation.error ?? importer.error)!.message}</Notice>
      )}
      {!!message && <Notice>{message}</Notice>}
    </View>
  );
}
