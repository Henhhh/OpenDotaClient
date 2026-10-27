import { View } from "react-native";
import type { PlayerProfile, PlayerStats } from "@/shared/api/client";
import { rankLabel } from "@/shared/utils/assets";
import { ApiState, RemoteImage, rate, numberText } from "@/shared/ui/ApiState";
import { Card } from "@/shared/ui/Card";
import { Txt } from "@/shared/ui/Txt";
import { IconButton } from "@/shared/ui/IconButton";
import { useFavorite } from "@/shared/state/AppState";
import { C, s } from "@/shared/theme/theme";
import { usePlayerApi, validAccount } from "../api/queries";
export function ProfileHeader({ id }: { id: string }) {
  const profile = usePlayerApi<PlayerProfile>(
    `/players/${id}`,
    {},
    validAccount(id),
  );
  const stats = usePlayerApi<PlayerStats>(
    `/players/${id}/stats`,
    {},
    validAccount(id),
  );
  const [favorite, toggle, favoriteState] = useFavorite("players", id);
  const p = profile.data?.data,
    st = stats.data?.data;
  return (
    <View style={{ gap: 12 }}>
      <ApiState
        pending={profile.isPending && profile.fetchStatus !== "idle"}
        error={profile.error}
        retry={() => void profile.refetch()}
      />
      {p && (
        <View style={s.row}>
          <RemoteImage uri={p.avatar_url} width={60} height={60} />
          <View style={{ flex: 1 }}>
            <Txt bold size={22}>
              {p.name ?? `Player ${id}`}
            </Txt>
            <Txt muted>
              {p.country ?? "Country unavailable"} ·{" "}
              {p.rank_tier == null
                ? "Rank unavailable"
                : rankLabel(p.rank_tier, p.leaderboard_rank)}
            </Txt>
            <Txt muted size={10}>
              Account ID {id}
            </Txt>
            <Txt muted size={10}>
              Steam ID {p.steam_id ?? "—"}
            </Txt>
          </View>
          <IconButton
            name="star"
            label="Favorite player"
            onPress={toggle}
            color={favorite ? C.gold : C.muted}
          />
        </View>
      )}
      {favoriteState.error && (
        <Txt color={C.loss}>{favoriteState.error.message}</Txt>
      )}
      {p?.is_public === false && (
        <Txt muted>This player has private match history.</Txt>
      )}
      <ApiState
        pending={stats.isPending && stats.fetchStatus !== "idle"}
        error={stats.error}
        retry={() => void stats.refetch()}
      />
      {st && (
        <Card>
          <View style={s.between}>
            {[
              ["WINS", numberText(st.wins)],
              ["LOSSES", numberText(st.losses)],
              ["WIN RATE", rate(st.win_rate)],
              [
                "RANK",
                p?.rank_tier == null
                  ? "—"
                  : rankLabel(p.rank_tier, p.leaderboard_rank),
              ],
            ].map(([label, value]) => (
              <View key={label}>
                <Txt muted size={9}>
                  {label}
                </Txt>
                <Txt bold size={12}>
                  {value}
                </Txt>
              </View>
            ))}
          </View>
        </Card>
      )}
    </View>
  );
}
