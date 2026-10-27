import { z } from "zod";
import type {
  OpenDotaClient,
  Team,
  TeamSearchService,
} from "../../../../shared/api-contract.ts";
import { compareId } from "../part2/http.ts";
import { UpstreamError } from "../../integrations/opendota/errors.ts";
function image(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

const teamsSchema = z.array(
  z.object({
    team_id: z.number().int().positive().safe(),
    name: z.string(),
    tag: z.string().nullish(),
    logo_url: z.string().nullish(),
    rating: z.number().finite().nullish(),
    wins: z.number().int().nonnegative().nullish(),
    losses: z.number().int().nonnegative().nullish(),
    last_match_time: z.number().int().nonnegative().nullish(),
  }),
);

/** Person 3 owns this service; upstream transport/cache remain owned by person 2. */
export function createTeamCatalogSearch(
  client: OpenDotaClient,
): TeamSearchService {
  return {
    async search(q, limit, options) {
      const term = q.trim().toLowerCase();
      if (
        [...term].length < 2 ||
        [...term].length > 80 ||
        !Number.isInteger(limit) ||
        limit < 1 ||
        limit > 20
      )
        throw new Error("Invalid internal team search arguments");
      const catalog = new Map<number, z.infer<typeof teamsSchema>[number]>();
      const dates: string[] = [];
      for (let page = 0; ; page++) {
        if (options.signal?.aborted) throw options.signal.reason;
        if (Date.now() >= options.deadline_ms)
          throw new UpstreamError("timeout");
        if (page >= 100) throw new UpstreamError("invalid_response");
        const result = await client.get(
          "/teams",
          { page },
          {
            ...options,
            validate: (raw) => teamsSchema.parse(raw),
            ttl_seconds: 300,
            cache_namespace: "part3:team-catalog:v1",
          },
        );
        dates.push(result.fetched_at);
        const size = catalog.size;
        for (const team of result.data) catalog.set(team.team_id, team);
        if (result.data.length < 1000) break;
        if (catalog.size === size) throw new UpstreamError("invalid_response");
      }
      const rows = [...catalog.values()].filter(
        (team) =>
          team.name.toLowerCase().includes(term) ||
          team.tag?.toLowerCase().includes(term),
      );
      rows.sort((a, b) => compareId(String(a.team_id), String(b.team_id)));
      const data: Team[] = rows.slice(0, limit).map((team) => ({
        team_id: String(team.team_id),
        name: team.name,
        tag: team.tag ?? null,
        logo_url: image(team.logo_url),
        rating: team.rating ?? null,
        wins: team.wins ?? null,
        losses: team.losses ?? null,
        region: null,
        last_match_time: team.last_match_time ?? null,
      }));
      return { data, fetched_at: dates.sort()[0] };
    },
  };
}
