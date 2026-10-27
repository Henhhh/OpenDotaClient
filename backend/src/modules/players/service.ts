import { z } from "zod";
import type {
  OpenDotaClient,
  UpstreamQuery,
  PlayerProfile,
  PlayerStats,
  PlayerMatch,
  PlayerHero,
  Peer,
  RankPoint,
  Page,
} from "../../../../shared/api-contract.ts";
import {
  ApiError,
  compareId,
  page,
  type Context,
  type ServiceResult,
} from "../../core/http.ts";
import { UpstreamError } from "../../integrations/opendota/errors.ts";
import { image } from "../heroes/service.ts";
import {
  rawAccountId,
  rawId,
  count,
  playerMatchSchema,
} from "../matches/schemas.ts";
import { matchSummary } from "../matches/service.ts";
const profileSchema = z.object({
  profile: z
    .object({
      account_id: rawAccountId,
      steamid: rawId.nullish(),
      personaname: z.string().nullish(),
      name: z.string().nullish(),
      avatarfull: z.string().nullish(),
      avatar: z.string().nullish(),
      profileurl: z.string().nullish(),
      loccountrycode: z.string().nullish(),
      is_public: z.boolean().nullish(),
      fh_unavailable: z.boolean().nullish(),
    })
    .nullable(),
  rank_tier: count.nullish(),
  leaderboard_rank: count.nullish(),
});
const totalsSchema = z
  .array(
    z.object({
      field: z.string(),
      n: count,
      sum: z.number().finite().nonnegative(),
    }),
  )
  .refine(
    (rows) => new Set(rows.map((r) => r.field)).size === rows.length,
    "Duplicate totals",
  );
const wlSchema = z.object({ win: count, lose: count });
const heroesSchema = z.array(
  z
    .object({
      hero_id: rawId,
      games: count,
      win: count,
      last_played: count.nullish(),
    })
    .refine((r) => r.win <= r.games),
);
const peersSchema = z.array(
  z
    .object({
      account_id: rawAccountId,
      personaname: z.string().nullish(),
      name: z.string().nullish(),
      avatarfull: z.string().nullish(),
      avatar: z.string().nullish(),
      loccountrycode: z.string().nullish(),
      rank_tier: count.nullish(),
      leaderboard_rank: count.nullish(),
      with_games: count,
      with_win: count,
      last_played: count.nullish(),
    })
    .refine((r) => r.with_win <= r.with_games),
);
const ratingsSchema = z.array(
  z.object({
    account_id: rawAccountId.optional(),
    time: z.union([
      count,
      z
        .string()
        .datetime({ offset: true })
        .transform((s) => Math.floor(Date.parse(s) / 1000)),
    ]),
    rank_tier: count.nullish(),
    solo_competitive_rank: count.nullish(),
    competitive_rank: count.nullish(),
  }),
);
const rate = (wins: number, games: number) => (games ? wins / games : null);
const pickedMatches = (rows: z.infer<typeof playerMatchSchema>[]) =>
  rows.filter(
    (m): m is (typeof rows)[number] & { hero_id: string } => m.hero_id !== 0,
  );
const result = <T>(
  data: T,
  fetched_at: string,
  source: ServiceResult<T>["source"] = "opendota",
): ServiceResult<T> => ({ data, fetched_at, source });
export interface MatchFilters {
  hero_id?: string;
  result?: "win" | "loss";
  game_mode?: number;
  lobby_type?: number;
  from?: number;
  to?: number;
  limit: number;
  offset: number;
}
export class PlayersService {
  private client: OpenDotaClient;
  constructor(client: OpenDotaClient) {
    this.client = client;
  }
  load<T>(
    path: string,
    schema: z.ZodType<T>,
    context: Context,
    ttl = 60,
    query?: UpstreamQuery,
  ) {
    return this.client.get(path, query, {
      ...context,
      ttl_seconds: ttl,
      cache_namespace: `part1:players:v2:${path}`,
      validate: (raw) => schema.parse(raw),
    });
  }
  async profile(
    id: string,
    context: Context,
  ): Promise<ServiceResult<PlayerProfile>> {
    const r = await this.load(`/players/${id}`, profileSchema, context, 300),
      p = r.data.profile;
    if (!p) throw new ApiError(404, "NOT_FOUND", "Player profile unavailable");
    if (p.account_id !== id) throw new UpstreamError("invalid_response");
    return result(
      {
        account_id: id,
        name: p.name ?? p.personaname ?? null,
        avatar_url: image(p.avatarfull ?? p.avatar),
        country: p.loccountrycode ?? null,
        rank_tier: r.data.rank_tier || null,
        leaderboard_rank: r.data.leaderboard_rank || null,
        steam_id: p.steamid ?? null,
        profile_url: image(p.profileurl),
        is_public: p.is_public ?? (p.fh_unavailable === true ? false : null),
      },
      r.fetched_at,
    );
  }
  private async historyProfile(id: string, context: Context) {
    const profile = await this.profile(id, context);
    if (profile.data.is_public === false)
      throw new ApiError(403, "FORBIDDEN", "Player match history is private");
    return profile;
  }
  async matches(
    id: string,
    f: MatchFilters,
    context: Context,
  ): Promise<ServiceResult<Page<PlayerMatch>>> {
    const profile = await this.historyProfile(id, context);
    const filters: UpstreamQuery = {};
    if (f.hero_id) filters.hero_id = f.hero_id;
    if (f.result) filters.win = f.result === "win" ? 1 : 0;
    if (f.game_mode !== undefined) filters.game_mode = f.game_mode;
    if (f.lobby_type !== undefined) filters.lobby_type = f.lobby_type;
    // No upstream limit/offset: exact date filtering and ordering occur on full matching history.
    const r = await this.load(
      `/players/${id}/matches`,
      z.array(playerMatchSchema),
      context,
      60,
      filters,
    );
    const rows: PlayerMatch[] = pickedMatches(r.data).map((m) => ({
      ...matchSummary(m),
      account_id: id,
      player_slot: m.player_slot,
      hero_id: m.hero_id,
      won: m.radiant_win == null ? null : m.player_slot < 128 === m.radiant_win,
      kills: m.kills,
      deaths: m.deaths,
      assists: m.assists,
      gold_per_min: m.gold_per_min ?? null,
      xp_per_min: m.xp_per_min ?? null,
      lane_role: m.lane_role ?? null,
      party_size: m.party_size ?? null,
      parsed:
        m.version === undefined
          ? null
          : typeof m.version === "number" && m.version > 0,
    }));
    const filtered = rows
      .filter(
        (m) =>
          (!f.hero_id || m.hero_id === f.hero_id) &&
          (!f.result || m.won === (f.result === "win")) &&
          (f.game_mode === undefined || m.game_mode === f.game_mode) &&
          (f.lobby_type === undefined || m.lobby_type === f.lobby_type) &&
          (f.from === undefined || m.start_time >= f.from) &&
          (f.to === undefined || m.start_time < f.to),
      )
      .sort(
        (a, b) =>
          b.start_time - a.start_time || compareId(a.match_id, b.match_id),
      );
    return result(
      page(filtered, f.limit, f.offset),
      [profile.fetched_at, r.fetched_at].sort()[0],
      "aggregate",
    );
  }
  async stats(
    id: string,
    scope: "all_time" | "recent",
    context: Context,
  ): Promise<ServiceResult<PlayerStats>> {
    const profile = await this.historyProfile(id, context);
    if (scope === "recent") {
      const r = await this.load(
        `/players/${id}/recentMatches`,
        z.array(playerMatchSchema),
        context,
      );
      const rows = pickedMatches(r.data)
          .sort(
            (a, b) =>
              b.start_time - a.start_time || compareId(a.match_id, b.match_id),
          )
          .slice(0, 20),
        n = rows.length;
      const won = (m: (typeof rows)[number]) =>
        m.radiant_win == null ? null : m.player_slot < 128 === m.radiant_win;
      const wins = rows.filter((m) => won(m) === true).length,
        losses = rows.filter((m) => won(m) === false).length;
      const avg = (
        field:
          | "kills"
          | "deaths"
          | "assists"
          | "gold_per_min"
          | "xp_per_min"
          | "duration",
      ) =>
        n && rows.every((m) => typeof m[field] === "number")
          ? rows.reduce((sum, m) => sum + (m[field] ?? 0), 0) / n
          : null;
      const kills = avg("kills"),
        deaths = avg("deaths"),
        assists = avg("assists");
      return result(
        {
          scope,
          matches: n,
          sample_size: n,
          wins,
          losses,
          win_rate: rate(wins, wins + losses),
          avg_kills: kills,
          avg_deaths: deaths,
          avg_assists: assists,
          kda:
            kills == null || deaths == null || assists == null
              ? null
              : (kills + assists) / Math.max(deaths, 1),
          avg_gpm: avg("gold_per_min"),
          avg_xpm: avg("xp_per_min"),
          avg_duration: avg("duration"),
        },
        [profile.fetched_at, r.fetched_at].sort()[0],
        "aggregate",
      );
    }
    const [record, totals] = await Promise.all([
      this.load(`/players/${id}/wl`, wlSchema, context),
      this.load(`/players/${id}/totals`, totalsSchema, context),
    ]);
    const fields = new Map(totals.data.map((r) => [r.field, r]));
    const n = fields.get("kills")?.n ?? 0;
    const avg = (field: string) => {
      const v = fields.get(field);
      return n > 0 && v?.n === n ? v.sum / n : null;
    };
    const kills = avg("kills"),
      deaths = avg("deaths"),
      assists = avg("assists"),
      wins = record.data.win,
      losses = record.data.lose;
    return result(
      {
        scope,
        matches: fields.get("duration")?.n ?? wins + losses,
        sample_size: n,
        wins,
        losses,
        win_rate: rate(wins, wins + losses),
        avg_kills: kills,
        avg_deaths: deaths,
        avg_assists: assists,
        kda:
          kills == null || deaths == null || assists == null
            ? null
            : (kills + assists) / Math.max(deaths, 1),
        avg_gpm: avg("gold_per_min"),
        avg_xpm: avg("xp_per_min"),
        avg_duration: avg("duration"),
      },
      [profile.fetched_at, record.fetched_at, totals.fetched_at].sort()[0],
      "aggregate",
    );
  }
  async heroes(
    id: string,
    sort: "games" | "win_rate",
    limit: number,
    offset: number,
    context: Context,
  ): Promise<ServiceResult<Page<PlayerHero>>> {
    const profile = await this.historyProfile(id, context),
      r = await this.load(`/players/${id}/heroes`, heroesSchema, context);
    const rows: PlayerHero[] = r.data
      .filter((h) => h.games > 0)
      .map((h) => ({
        hero_id: h.hero_id,
        games: h.games,
        wins: h.win,
        losses: h.games - h.win,
        win_rate: rate(h.win, h.games),
        last_played: h.last_played || null,
      }));
    rows.sort(
      (a, b) =>
        (sort === "games"
          ? b.games - a.games
          : (b.win_rate ?? -1) - (a.win_rate ?? -1)) ||
        compareId(a.hero_id, b.hero_id),
    );
    return result(
      page(rows, limit, offset),
      [profile.fetched_at, r.fetched_at].sort()[0],
      "aggregate",
    );
  }
  async peers(
    id: string,
    limit: number,
    offset: number,
    context: Context,
  ): Promise<ServiceResult<Page<Peer>>> {
    const profile = await this.historyProfile(id, context),
      r = await this.load(`/players/${id}/peers`, peersSchema, context);
    const rows: Peer[] = r.data
      .filter((p) => p.with_games > 0)
      .map((p) => ({
        account_id: p.account_id,
        name: p.name ?? p.personaname ?? null,
        avatar_url: image(p.avatarfull ?? p.avatar),
        country: p.loccountrycode ?? null,
        rank_tier: p.rank_tier || null,
        leaderboard_rank: p.leaderboard_rank || null,
        games: p.with_games,
        wins: p.with_win,
        losses: p.with_games - p.with_win,
        win_rate: rate(p.with_win, p.with_games),
        last_played: p.last_played || null,
      }));
    rows.sort(
      (a, b) => b.games - a.games || compareId(a.account_id, b.account_id),
    );
    return result(
      page(rows, limit, offset),
      [profile.fetched_at, r.fetched_at].sort()[0],
      "aggregate",
    );
  }
  async ratings(
    id: string,
    limit: number,
    offset: number,
    context: Context,
  ): Promise<ServiceResult<Page<RankPoint>>> {
    const profile = await this.historyProfile(id, context),
      r = await this.load(
        `/players/${id}/ratings`,
        ratingsSchema,
        context,
        300,
      );
    if (r.data.some((p) => p.account_id && p.account_id !== id))
      throw new UpstreamError("invalid_response");
    const points = new Map<number, RankPoint>();
    // Resolve duplicate timestamps deterministically using the greater known medal/MMR, never interpolation.
    for (const p of r.data) {
      const point = {
        time: p.time,
        rank_tier: p.rank_tier || null,
        mmr: p.solo_competitive_rank || null,
      };
      if (point.rank_tier === null && point.mmr === null) continue;
      const previous = points.get(p.time);
      if (
        !previous ||
        (point.rank_tier ?? -1) > (previous.rank_tier ?? -1) ||
        (point.rank_tier === previous.rank_tier &&
          (point.mmr ?? -1) > (previous.mmr ?? -1))
      )
        points.set(p.time, point);
    }
    if (!points.size)
      throw new ApiError(
        501,
        "FEATURE_UNAVAILABLE",
        "Rank history unavailable for this player",
      );
    return result(
      page(
        [...points.values()].sort((a, b) => b.time - a.time),
        limit,
        offset,
      ),
      [profile.fetched_at, r.fetched_at].sort()[0],
      "aggregate",
    );
  }
}
