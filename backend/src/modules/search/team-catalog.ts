import { z } from 'zod';
import type { OpenDotaClient, Team, TeamSearchService } from '../../../../shared/api-contract.ts';
import { compareId } from '../part2/http.ts';
import { image } from '../heroes/service.ts';

const teamsSchema = z.array(z.object({
  team_id: z.number().int().positive().safe(), name: z.string(), tag: z.string().nullish(),
  logo_url: z.string().nullish(), rating: z.number().finite().nullish(),
  wins: z.number().int().nonnegative().nullish(), losses: z.number().int().nonnegative().nullish(),
  last_match_time: z.number().int().nonnegative().nullish(),
}));

/** Search-only adapter over the full upstream catalog, replaceable by person 3's service. */
export function createTeamCatalogSearch(client: OpenDotaClient): TeamSearchService {
  return {
    async search(q, limit, options) {
      const term = q.trim().toLowerCase();
      if ([...term].length < 2 || [...term].length > 80 || !Number.isInteger(limit) || limit < 1 || limit > 20) throw new Error('Invalid internal team search arguments');
      const result = await client.get('/teams', undefined, {
        ...options, validate: raw => teamsSchema.parse(raw), ttl_seconds: 300,
        cache_namespace: 'part2:team-catalog:v1',
      });
      const rows = result.data.filter(team => team.name.toLowerCase().includes(term) || team.tag?.toLowerCase().includes(term));
      rows.sort((a, b) => compareId(String(a.team_id), String(b.team_id)));
      const data: Team[] = rows.slice(0, limit).map(team => ({
        team_id: String(team.team_id), name: team.name, tag: team.tag ?? null,
        logo_url: image(team.logo_url), rating: team.rating ?? null,
        wins: team.wins ?? null, losses: team.losses ?? null,
        region: null, last_match_time: team.last_match_time ?? null,
      }));
      return { data, fetched_at: result.fetched_at };
    },
  };
}
