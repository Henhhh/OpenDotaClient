import { View } from "react-native";
import type { PlayerStats } from "@/shared/api/client";
import { usePlayerApi, validAccount } from "../api/queries";
import { ApiState, rate } from "@/shared/ui/ApiState";
import { Card } from "@/shared/ui/Card";
import { Txt } from "@/shared/ui/Txt";
import { fmtDuration } from "@/shared/utils/format";
import { s } from "@/shared/theme/theme";
import { Ring } from "@/shared/ui/Ring";
export function RecentForm({ id }: { id: string }) {
  const q = usePlayerApi<PlayerStats>(
    `/players/${id}/stats`,
    { scope: "recent" },
    validAccount(id),
  );
  const d = q.data?.data,
    n = (v: number | null) => (v == null ? "—" : v.toFixed(1));
  return (
    <Card>
      <ApiState
        pending={q.isPending}
        error={q.error}
        retry={() => void q.refetch()}
      />
      {d && (
        <>
          {d.win_rate == null ? (
            <Txt bold size={24}>
              {rate(d.win_rate)}
            </Txt>
          ) : (
            <Ring value={d.win_rate} />
          )}
          <Txt>
            {d.wins}W · {d.losses}L · {d.matches} recent matches
          </Txt>
          <View style={s.between}>
            <Txt>AVG K/D/A</Txt>
            <Txt>
              {n(d.avg_kills)}/{n(d.avg_deaths)}/{n(d.avg_assists)}
            </Txt>
          </View>
          <View style={s.between}>
            <Txt>GPM {n(d.avg_gpm)}</Txt>
            <Txt>XPM {n(d.avg_xpm)}</Txt>
            <Txt>
              {d.avg_duration == null ? "—" : fmtDuration(d.avg_duration)}
            </Txt>
          </View>
        </>
      )}
    </Card>
  );
}
