import { z } from "zod";
import type {
  OpenDotaClient,
  UpstreamQuery,
  Team,
  League,
  ProPlayer,
  MatchSummary,
  Page,
} from "../../../../shared/api-contract.ts";
import { ApiError, compareId, page } from "../../core/http.ts";
import type { Context, ServiceResult } from "../../core/http.ts";
import { image } from "../heroes/service.ts";
import { UpstreamError } from "../../integrations/opendota/errors.ts";

const id = z.number().int().positive().safe();
const count = z.number().int().nonnegative();
const teamSchema = z.object({
  team_id: id,
  name: z.string(),
  tag: z.string().nullish(),
  logo_url: z.string().nullish(),
  rating: z.number().finite().nullish(),
  wins: count.nullish(),
  losses: count.nullish(),
  last_match_time: count.nullish(),
});
const leagueSchema = z.object({
  leagueid: id,
  name: z.string(),
  tier: z.string().nullish(),
});
const playerSchema = z.object({
  account_id: id.max(4294967295),
  name: z.string().nullish(),
  personaname: z.string().nullish(),
  avatar: z.string().nullish(),
  avatarfull: z.string().nullish(),
  loccountrycode: z.string().nullish(),
  rank_tier: count.nullish(),
  leaderboard_rank: count.nullish(),
  team_id: count.nullish(),
  team_name: z.string().nullish(),
});
const matchSchema = z.object({
  match_id: id,
  start_time: count,
  duration: count,
  game_mode: count.nullish(),
  lobby_type: count.nullish(),
  radiant_win: z.boolean().nullish(),
  radiant_score: count.nullish(),
  dire_score: count.nullish(),
  leagueid: count.nullish(),
  radiant_team_id: count.nullish(),
  dire_team_id: count.nullish(),
});
const teamDto = (t: z.infer<typeof teamSchema>): Team => ({
  team_id: String(t.team_id),
  name: t.name,
  tag: t.tag ?? null,
  logo_url: image(t.logo_url),
  rating: t.rating ?? null,
  wins: t.wins ?? null,
  losses: t.losses ?? null,
  region: null,
  last_match_time: t.last_match_time ?? null,
});
const leagueDto = (l: z.infer<typeof leagueSchema>): League => ({
  league_id: String(l.leagueid),
  name: l.name,
  tier: l.tier ?? null,
  start_time: null,
  end_time: null,
  prize_usd: null,
  status: null,
});
const playerDto = (p: z.infer<typeof playerSchema>): ProPlayer => ({
  account_id: String(p.account_id),
  name: p.name ?? p.personaname ?? null,
  avatar_url: image(p.avatarfull ?? p.avatar),
  country: p.loccountrycode ?? null,
  rank_tier: p.rank_tier || null,
  leaderboard_rank: p.leaderboard_rank ?? null,
  team_id: p.team_id ? String(p.team_id) : null,
  team_name: p.team_name ?? null,
  real_name: null,
  role: null,
});
const result = <T>(data: T, fetched_at: string): ServiceResult<T> => ({
  data,
  fetched_at,
  source: "opendota",
});
export class ProService {
  private client: OpenDotaClient;
  constructor(client: OpenDotaClient) {
    this.client = client;
  }
  load<T>(
    path: string,
    schema: z.ZodType<T>,
    context: Context,
    ttl = 300,
    query?: UpstreamQuery,
  ) {
    return this.client.get(path, query, {
      ...context,
      validate: (raw) => schema.parse(raw),
      ttl_seconds: ttl,
      cache_namespace:
        path === "/teams" ? "part3:team-catalog:v1" : `part3:pro:v1:${path}`,
    });
  }
  async teams(context: Context) {
    const rows = new Map<string, Team>();
    const dates: string[] = [];
    for (let p = 0; ; p++) {
      if (p >= 100) throw new UpstreamError("invalid_response");
      const r = await this.load("/teams", z.array(teamSchema), context, 300, {
        page: p,
      });
      dates.push(r.fetched_at);
      const size = rows.size;
      for (const row of r.data) rows.set(String(row.team_id), teamDto(row));
      if (r.data.length < 1000) break;
      if (rows.size === size) throw new UpstreamError("invalid_response");
    }
    return result([...rows.values()], dates.sort()[0]);
  }
  async team(id: string, context: Context) {
    let r;
    try {
      r = await this.load(`/teams/${id}`, teamSchema, context);
    } catch (error) {
      // OpenDota can send HTTP 200 with an empty body for a missing team.
      // Confirm against the complete catalog; malformed known entities remain 502.
      if (error instanceof UpstreamError && error.kind === "invalid_response") {
        const catalog = await this.teams(context);
        if (!catalog.data.some((t) => t.team_id === id))
          throw new ApiError(404, "NOT_FOUND", "Team not found");
      }
      throw error;
    }
    if (String(r.data.team_id) !== id)
      throw new UpstreamError("invalid_response");
    return result(teamDto(r.data), r.fetched_at);
  }
  async leagues(context: Context) {
    const r = await this.load("/leagues", z.array(leagueSchema), context);
    return result(r.data.map(leagueDto), r.fetched_at);
  }
  async league(id: string, context: Context) {
    let r;
    try {
      r = await this.load(`/leagues/${id}`, leagueSchema, context);
    } catch (error) {
      if (error instanceof UpstreamError && error.kind === "invalid_response") {
        const catalog = await this.leagues(context);
        if (!catalog.data.some((l) => l.league_id === id))
          throw new ApiError(404, "NOT_FOUND", "League not found");
      }
      throw error;
    }
    if (String(r.data.leagueid) !== id)
      throw new UpstreamError("invalid_response");
    return result(leagueDto(r.data), r.fetched_at);
  }
  async players(context: Context) {
    const r = await this.load("/proPlayers", z.array(playerSchema), context);
    return result(r.data.map(playerDto), r.fetched_at);
  }
  async teamPlayers(id: string, context: Context) {
    const t = await this.team(id, context);
    const r = await this.load(
      `/teams/${id}/players`,
      z.array(
        playerSchema.extend({ is_current_team_member: z.boolean().nullish() }),
      ),
      context,
    );
    return result(
      r.data.map((p) => ({
        ...playerDto(p),
        team_id: p.is_current_team_member ? id : null,
        team_name: p.is_current_team_member ? t.data.name : null,
      })),
      [t.fetched_at, r.fetched_at].sort()[0],
    );
  }
  async leagueTeams(id: string, context: Context) {
    await this.league(id, context);
    const r = await this.load(
      `/leagues/${id}/teams`,
      z.array(teamSchema),
      context,
    );
    return result(r.data.map(teamDto), r.fetched_at);
  }
  async matches(
    options: {
      team_id?: string;
      league_id?: string;
      limit: number;
      offset: number;
    },
    context: Context,
  ): Promise<ServiceResult<Page<MatchSummary>>> {
    // Team/league endpoints return their finite source snapshot; unfiltered uses latest pro snapshot.
    const path = options.team_id
      ? `/teams/${options.team_id}/matches`
      : options.league_id
        ? `/leagues/${options.league_id}/matches`
        : "/proMatches";
    if (options.team_id) await this.team(options.team_id, context);
    else if (options.league_id) await this.league(options.league_id, context);
    const schema = matchSchema.extend({
      radiant: z.boolean().nullish(),
      opposing_team_id: count.nullish(),
    });
    const r = await this.load(path, z.array(schema), context, 60);
    const rows = r.data
      .filter(
        (m) => !options.league_id || String(m.leagueid) === options.league_id,
      )
      .sort(
        (a, b) =>
          b.start_time - a.start_time ||
          compareId(String(a.match_id), String(b.match_id)),
      );
    const slice = page(rows, options.limit, options.offset);
    const dates = [r.fetched_at];
    const items: MatchSummary[] = [];
    // Sequential enrichment respects shared client quota; never invent missing mode/lobby values.
    for (const row of slice.items) {
      let m: z.infer<typeof matchSchema> = row;
      if (m.game_mode == null || m.lobby_type == null) {
        const detail = await this.load(
          `/matches/${m.match_id}`,
          matchSchema.extend({ game_mode: count, lobby_type: count }),
          context,
          60,
        );
        if (detail.data.match_id !== row.match_id)
          throw new UpstreamError("invalid_response");
        m = detail.data;
        dates.push(detail.fetched_at);
      }
      const own = options.team_id ?? null,
        opponent = row.opposing_team_id ? String(row.opposing_team_id) : null;
      items.push({
        match_id: String(m.match_id),
        start_time: m.start_time,
        duration: m.duration,
        game_mode: m.game_mode!,
        lobby_type: m.lobby_type!,
        radiant_win: m.radiant_win ?? null,
        radiant_score: m.radiant_score ?? null,
        dire_score: m.dire_score ?? null,
        league_id: m.leagueid ? String(m.leagueid) : null,
        radiant_team_id: m.radiant_team_id
          ? String(m.radiant_team_id)
          : row.radiant === true
            ? own
            : row.radiant === false
              ? opponent
              : null,
        dire_team_id: m.dire_team_id
          ? String(m.dire_team_id)
          : row.radiant === false
            ? own
            : row.radiant === true
              ? opponent
              : null,
      });
    }
    return result(
      { ...slice, items, total: path === "/proMatches" ? null : slice.total },
      dates.sort()[0],
    );
  }
}
