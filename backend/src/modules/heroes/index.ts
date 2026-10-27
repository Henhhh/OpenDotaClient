import { Router } from 'express';
import { z } from 'zod';
import type { OpenDotaClient } from '../../../../shared/api-contract.ts';
import { HeroesService } from './service.ts';
import { endpoint, query, pagination, text, numericId, compareId, page, ApiError } from '../../core/http.ts';
export { HeroesService } from './service.ts';
export function createRouter(deps: { client: OpenDotaClient; enableRankings?: boolean }) {
  const router = Router();
  const service = new HeroesService(deps.client);
  const empty = z.object({}).strict();
  const heroId = (value: unknown) => numericId.parse(value);
  router.get('/', endpoint(async (req, context) => {
    const q = query(req, z.object({ ...pagination, q: text().optional(), primary_attr: z.enum(['str', 'agi', 'int', 'all']).optional(), role: text().optional(), sort: z.enum(['name', 'id']).default('name'), order: z.enum(['asc', 'desc']).default('asc') }).strict());
    const result = await service.catalog(context);
    const roles = new Set(result.data.flatMap(h => h.roles.map(role => role.toLowerCase())));
    if (q.role && !roles.has(q.role.toLowerCase())) throw new z.ZodError([{ code: 'custom', path: ['role'], message: 'Unknown role' }]);
    const rows = result.data.filter(h => (!q.q || h.name.toLowerCase().includes(q.q.toLowerCase())) && (!q.primary_attr || h.primary_attr === q.primary_attr) && (!q.role || h.roles.some(role => role.toLowerCase() === q.role!.toLowerCase())));
    rows.sort((a, b) => (q.sort === 'id' ? compareId(a.hero_id, b.hero_id) : a.name.localeCompare(b.name)) * (q.order === 'asc' ? 1 : -1) || compareId(a.hero_id, b.hero_id));
    return { ...result, data: page(rows, q.limit, q.offset) };
  }));
  router.get('/stats', endpoint(async (req, context) => {
    const q = query(req, z.object({ ...pagination, bracket: z.string().regex(/^[1-8]$/).transform(Number).optional(), sort: z.enum(['win_rate', 'picks']).default('picks') }).strict());
    const result = await service.stats(q.bracket, context);
    result.data.sort((a, b) => {
      const av = a[q.sort], bv = b[q.sort];
      return (av === null ? (bv === null ? 0 : 1) : bv === null ? -1 : bv - av) || compareId(a.hero_id, b.hero_id);
    });
    return { ...result, data: page(result.data, q.limit, q.offset) };
  }));
  router.get('/:h', endpoint((req, context) => { query(req, empty); return service.detail(heroId(req.params.h), context); }));
  router.get('/:h/matchups', endpoint(async (req, context) => {
    const q = query(req, z.object(pagination).strict());
    const result = await service.matchups(heroId(req.params.h), context);
    result.data.sort((a, b) => b.games - a.games || compareId(a.against_hero_id, b.against_hero_id));
    return { ...result, data: page(result.data, q.limit, q.offset) };
  }));
  router.get('/:h/items', endpoint((req, context) => { query(req, empty); return service.popularity(heroId(req.params.h), context); }));
  router.get('/:h/rankings', endpoint(async (req, context) => {
    const id = heroId(req.params.h);
    const q = query(req, z.object(pagination).strict());
    if (!deps.enableRankings) { throw new ApiError(501, 'FEATURE_UNAVAILABLE', 'Hero rankings not enabled'); }
    const result = await service.rankings(id, context);
    return { ...result, data: page(result.data, q.limit, q.offset) };
  }));
  return router;
}
