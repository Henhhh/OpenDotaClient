import { View } from "react-native";
import type { MatchPlayer } from "@/shared/api/client";
import { useItems } from "@/features/heroes/api/queries";
import { ApiState, RemoteImage } from "@/shared/ui/ApiState";
import { Card } from "@/shared/ui/Card";
import { Txt } from "@/shared/ui/Txt";
import { s } from "@/shared/theme/theme";
import { fmtDuration } from "@/shared/utils/format";
export function MatchInventory({ player }: { player: MatchPlayer }) {
  const q = useItems();
  const item = (id: string | null) =>
    q.data?.data.find((i) => i.item_id === id);
  return (
    <Card>
      <ApiState
        pending={q.isPending}
        error={q.error}
        retry={() => void q.refetch()}
      />
      <Txt bold>Inventory</Txt>
      <View style={s.wrap}>
        {player.items.map((id, i) => (
          <View key={i}>
            <RemoteImage
              uri={item(id)?.image_url ?? null}
              width={46}
              height={34}
            />
            <Txt muted size={9}>
              {id ? (item(id)?.name ?? `Item ${id}`) : "Empty"}
            </Txt>
          </View>
        ))}
      </View>
      <Txt bold>Backpack</Txt>
      <View style={s.wrap}>
        {player.backpack.map((id, i) => (
          <Txt key={i} muted>
            {id ? (item(id)?.name ?? `Item ${id}`) : "Empty"}
          </Txt>
        ))}
      </View>
      <Txt muted>
        Neutral:{" "}
        {player.neutral_item
          ? (item(player.neutral_item)?.name ?? player.neutral_item)
          : "—"}
      </Txt>
      <Txt bold>Purchase timeline</Txt>
      {player.purchases === null ? (
        <Txt muted>Purchase timeline unavailable. Parsing may be required.</Txt>
      ) : player.purchases.length ? (
        player.purchases.map((p, i) => (
          <Txt key={i}>
            {fmtDuration(p.time)} ·{" "}
            {item(p.item_id)?.name ?? `Item ${p.item_id}`}
          </Txt>
        ))
      ) : (
        <Txt muted>No purchases recorded.</Txt>
      )}
      <Txt bold>Ability upgrades</Txt>
      <Txt muted>
        {player.ability_upgrades?.join(" → ") ??
          "Ability upgrades unavailable."}
      </Txt>
    </Card>
  );
}
