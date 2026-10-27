import { Router } from 'express';
import { z } from 'zod';
import type { OpenDotaClient, TeamSearchService, SearchResults } from '../../../../shared/api-contract.ts';
import { HeroesService, playerDto } from '../heroes/service.ts';
import { playerSchema } from '../heroes/schemas.ts';
import { ApiError, endpoint, query, text, searchLimit, compareId, numericId } from '../part2/http.ts';
export function createRouter(deps: { client: OpenDotaClient; teams?: TeamSearchService }) {
  const router = Router();
  const service = new HeroesService(deps.client);
  router.get('/', endpoint(async (req, context) => {
    const q = query(req, z.object({ q: text(2), type: z.enum(['all', 'player', 'hero', 'team', 'match']).default('all'), limit: searchLimit }).strict());
    if (['all', 'team'].includes(q.type) && !deps.teams) throw new ApiError(501, 'FEATURE_UNAVAILABLE', 'Team search service not integrated');
    const data: SearchResults = { players: [], heroes: [], teams: [], match: null };
    const dates: string[] = [];
    const tasks: Promise<void>[] = [];
    if (['all', 'player'].includes(q.type)) tasks.push((async () => {
      const result = await service.load('/search', z.array(playerSchema), context, 60, { q: q.q });
      data.players = result.data.slice(0, q.limit).map(playerDto); dates.push(result.fetched_at);
    })());
    if (['all', 'hero'].includes(q.type)) tasks.push((async () => {
      const result = await service.catalog(context);
      data.heroes = result.data.filter(h => h.name.toLowerCase().includes(q.q.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name) || compareId(a.hero_id, b.hero_id)).slice(0, q.limit); dates.push(result.fetched_at);
    })());
    if (['all', 'team'].includes(q.type)) tasks.push((async () => {
      const result = await deps.teams!.search(q.q, q.limit, context); data.teams = result.data; dates.push(result.fetched_at);
    })());
    if (['all', 'match'].includes(q.type) && numericId.safeParse(q.q).success) data.match = { match_id: q.q, verified: false };
    await Promise.all(tasks);
    return { data, fetched_at: dates.sort()[0] ?? new Date().toISOString(), source: q.type === 'player' ? 'opendota' : 'aggregate' };
  }));
  return router;
}
