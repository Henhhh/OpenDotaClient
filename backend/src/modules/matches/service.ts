import type {
  OpenDotaClient,
  MatchSummary,
  MatchDetail,
  MatchPlayer,
} from "../../../../shared/api-contract.ts";
import type { Context, ServiceResult } from "../../core/http.ts";
import { UpstreamError } from "../../integrations/opendota/errors.ts";
import { HeroesService } from "../heroes/service.ts";
import { matchSchema, type RawSummary } from "./schemas.ts";
export function matchSummary(m: RawSummary): MatchSummary {
  return {
    match_id: m.match_id,
    start_time: m.start_time,
    duration: m.duration,
    game_mode: m.game_mode,
    lobby_type: m.lobby_type,
    radiant_win: m.radiant_win ?? null,
    radiant_score: m.radiant_score ?? null,
    dire_score: m.dire_score ?? null,
    league_id: m.leagueid ?? null,
    radiant_team_id: m.radiant_team_id ?? null,
    dire_team_id: m.dire_team_id ?? null,
  };
}
export class MatchesService {
  private client: OpenDotaClient;
  constructor(client: OpenDotaClient) {
    this.client = client;
  }
  async raw(id: string, context: Context, fresh = false) {
    const result = await this.client.get(`/matches/${id}`, undefined, {
      ...context,
      ttl_seconds: fresh ? 0 : 60,
      cache_namespace: fresh
        ? "part1:match-verification:v1"
        : "part1:match-detail:v1",
      validate: (raw) => matchSchema.parse(raw),
    });
    if (result.data.match_id !== id)
      throw new UpstreamError("invalid_response");
    return result;
  }
  async detail(
    id: string,
    context: Context,
  ): Promise<ServiceResult<MatchDetail>> {
    const result = await this.raw(id, context),
      m = result.data,
      parsed = typeof m.version === "number" && m.version > 0;
    let itemIds: Map<string, string> | undefined;
    const dates = [result.fetched_at];
    if (parsed && m.players.some((p) => p.purchase_log?.length)) {
      const items = await new HeroesService(this.client).items(context);
      itemIds = new Map(items.data.map((i) => [i.key, i.item_id]));
      dates.push(items.fetched_at);
    }
    const players: MatchPlayer[] = m.players.map((p) => ({
      account_id: p.account_id === "4294967295" ? null : (p.account_id ?? null),
      player_slot: p.player_slot,
      hero_id: p.hero_id,
      name: p.name ?? p.personaname ?? null,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      level: p.level ?? null,
      gold_per_min: p.gold_per_min ?? null,
      xp_per_min: p.xp_per_min ?? null,
      last_hits: p.last_hits ?? null,
      denies: p.denies ?? null,
      hero_damage: p.hero_damage ?? null,
      tower_damage: p.tower_damage ?? null,
      hero_healing: p.hero_healing ?? null,
      net_worth: p.net_worth ?? null,
      items: (
        ["item_0", "item_1", "item_2", "item_3", "item_4", "item_5"] as const
      ).map((k) => p[k] ?? null),
      backpack: (["backpack_0", "backpack_1", "backpack_2"] as const).map(
        (k) => p[k] ?? null,
      ),
      neutral_item: p.item_neutral ?? null,
      purchases:
        parsed &&
        p.purchase_log &&
        p.purchase_log.every((i) => itemIds?.has(i.key))
          ? p.purchase_log.map((i) => ({
              item_id: itemIds!.get(i.key)!,
              time: i.time,
            }))
          : parsed && p.purchase_log?.length === 0
            ? []
            : null,
      ability_upgrades:
        parsed &&
        p.ability_upgrades_arr &&
        p.ability_upgrades_arr.every((i) => i > 0)
          ? p.ability_upgrades_arr.map(String)
          : null,
    }));
    return {
      data: {
        ...matchSummary(m),
        parsed,
        players,
        picks_bans: m.picks_bans ?? null,
        radiant_gold_adv: parsed ? (m.radiant_gold_adv ?? null) : null,
        radiant_xp_adv: parsed ? (m.radiant_xp_adv ?? null) : null,
      },
      fetched_at: dates.sort()[0],
      source: dates.length > 1 ? "aggregate" : "opendota",
    };
  }
}
