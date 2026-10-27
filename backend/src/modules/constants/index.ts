import { Router } from 'express';
import { z } from 'zod';
import type { OpenDotaClient } from '../../../../shared/api-contract.ts';
import { HeroesService } from '../heroes/service.ts';
import { endpoint, query, pagination, text, page, compareId } from '../../core/http.ts';
export function createRouter(deps: { client: OpenDotaClient }) {
  const router = Router();
  const service = new HeroesService(deps.client);
  router.get('/items', endpoint(async (req, context) => {
    const q = query(req, z.object({ ...pagination, q: text().optional() }).strict());
    const result = await service.items(context);
    const rows = result.data.filter(i => !q.q || i.name.toLowerCase().includes(q.q.toLowerCase())).sort((a, b) => compareId(a.item_id, b.item_id));
    return { ...result, data: page(rows, q.limit, q.offset) };
  }));
  return router;
}
