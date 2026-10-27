import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { OpenDotaClient, UpstreamGetOptions, TeamSearchService } from '../../shared/api-contract.ts';
import { createPart2App } from '../src/part2-dev.ts';
import { contractClient, OpenDotaClient as Transport, UpstreamError } from '../src/integrations/opendota/index.ts';
import { createTeamCatalogSearch } from '../src/modules/search/team-catalog.ts';

const time = '2026-10-27T00:00:00Z';
const hero = (id: number, name: string, attr = 'agi') => ({ id, name: `npc_dota_hero_${name.toLowerCase()}`, localized_name: name, primary_attr: attr, attack_type: 'Melee', roles: ['Carry'], pro_pick: 10, pro_win: 6, pro_ban: 2, '7_pick': 20, '7_win': 11 });
const heroes = [hero(10, 'Beta', 'all'), hero(2, 'Alpha'), hero(1, 'Gamma')];
const fixtures: Record<string, unknown> = {
  '/heroStats': heroes,
  '/constants/hero_abilities': { npc_dota_hero_gamma: { abilities: ['blink', ['variant'], 'generic_hidden'], talents: [] } },
  '/constants/abilities': { blink: { dname: 'Blink', desc: 'Move', img: '/apps/dota2/images/test.png' }, variant: { dname: 'Variant' } },
  '/heroes/1/matchups': [{ hero_id: 2, games_played: 3, wins: 2 }, { hero_id: 10, games_played: 3, wins: 1 }],
  '/heroes/1/itemPopularity': { start_game_items: { '10': 2, '2': 2 }, early_game_items: {}, mid_game_items: {}, late_game_items: {} },
  '/constants/items': { foo: { id: 10, dname: 'Foo', cost: 0 }, bar: { id: 2, dname: 'Bar', abilities: [{ description: 'Item text' }] } },
  '/search': [{ account_id: 1, personaname: 'Player' }],
  '/rankings': { hero_id: 1, rankings: [{ account_id: 10, score: 9 }, { account_id: 2, score: 9 }] },
  '/teams': [{ team_id: 10, name: 'Spirit B', tag: 'SB', wins: 1 }, { team_id: 2, name: 'Team Spirit', tag: 'TS' }, { team_id: 1, name: 'Other', tag: 'SPIRIT' }],
};
function fake(overrides: Record<string, unknown> = {}) {
  const calls: string[] = [];
  const client: OpenDotaClient = {
    async get<T>(path: string, _query: unknown, options: UpstreamGetOptions<T>) {
      calls.push(path);
      assert.ok(options.deadline_ms > Date.now());
      assert.ok(options.cache_namespace);
      const raw = Object.hasOwn(overrides, path) ? overrides[path] : fixtures[path];
      if (raw instanceof Error) throw raw;
      try { return { data: options.validate(structuredClone(raw)), fetched_at: time }; }
      catch { throw new UpstreamError('invalid_response'); }
    },
    async post() { throw new Error('Unexpected POST'); },
  };
  return { client, calls };
}
async function host(run: (get: (path: string) => Promise<{ status: number; body: any; headers: Headers }>) => Promise<void>, options: { overrides?: Record<string, unknown>; teams?: TeamSearchService; rankings?: boolean } = {}) {
  const f = fake(options.overrides);
  const server = createPart2App({ client: f.client, teams: options.teams, enableRankings: options.rankings }).listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const port = (server.address() as AddressInfo).port;
  try { await run(async path => { const response = await fetch(`http://127.0.0.1:${port}/api/v1${path}`); return { status: response.status, body: await response.json(), headers: response.headers }; }); }
  finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
  return f;
}
test('catalog filters Universal, sorts ID numerically, paginates after filtering', async () => {
  await host(async get => {
    const all = await get('/heroes?sort=id&limit=1&offset=1');
    assert.equal(all.status, 200); assert.equal(all.body.data.items[0].hero_id, '2');
    assert.equal(all.body.data.total, 3); assert.equal(all.body.data.has_more, true);
    const universal = await get('/heroes?primary_attr=all&role=carry');
    assert.deepEqual(universal.body.data.items.map((h: any) => h.hero_id), ['10']);
    assert.equal(universal.headers.get('x-request-id'), universal.body.meta.request_id);
    assert.equal(universal.body.meta.fetched_at, time);
  });
});
test('strict validation rejects unknown/duplicate fields and malformed IDs', async () => {
  await host(async get => {
    for (const path of ['/heroes?unknown=x', '/heroes?limit=0', '/heroes?limit=2&limit=3', '/heroes/01', '/heroes/0', '/heroes?role=invalid', '/heroes/stats?bracket=9', '/search?q=a', '/search?q=ab&type=no', '/constants/items?offset=-1', '/heroes/1?bad=1']) {
      const r = await get(path); assert.equal(r.status, 400, path); assert.equal(r.body.error.code, 'VALIDATION_ERROR');
    }
  });
});
test('hero detail nullable fields, variants and unknown hero', async () => {
  await host(async get => {
    const r = await get('/heroes/1'); assert.equal(r.status, 200);
    assert.equal(r.body.data.base_health, null); assert.equal(r.body.data.talents, null);
    assert.deepEqual(r.body.data.abilities.map((a: any) => a.key), ['blink', 'variant']);
    assert.ok(r.body.meta.unavailable_fields.includes('/data/talents'));
    assert.equal((await get('/heroes/999')).status, 404);
  });
});
test('stats route precedes ID and uses exact bracket data without invented pick rate', async () => {
  await host(async get => {
    const r = await get('/heroes/stats?bracket=7'); assert.equal(r.status, 200);
    assert.equal(r.body.data.items[0].picks, 20); assert.equal(r.body.data.items[0].win_rate, 0.55);
    assert.equal(r.body.data.items[0].pick_rate, null); assert.equal(r.body.data.items[0].bracket, 7);
    const pro = await get('/heroes/stats'); assert.equal(pro.body.data.items[0].bracket, null); assert.equal(pro.body.data.items[0].bans, 2);
  });
});
test('missing bracket stats excluded, null rates sorted last', async () => {
  await host(async get => {
    const r = await get('/heroes/stats?sort=win_rate'); assert.equal(r.status, 200);
    assert.deepEqual(r.body.data.items.map((h: any) => h.hero_id), ['2', '1']);
    const missing = await get('/heroes/stats?bracket=8'); assert.equal(missing.body.data.total, 0);
  }, { overrides: { '/heroStats': [{ ...hero(1, 'Zero'), pro_pick: 0, pro_win: 0 }, hero(2, 'Valid')] } });
});
test('matchups and popularity preserve counts and stable numeric tie order', async () => {
  await host(async get => {
    const r = await get('/heroes/1/matchups'); assert.equal(r.status, 200);
    assert.deepEqual(r.body.data.items.map((h: any) => h.against_hero_id), ['2', '10']);
    const items = await get('/heroes/1/items'); assert.equal(items.status, 200);
    assert.equal(items.body.data.source_population, 'professional');
    assert.deepEqual(items.body.data.phases[0].items.map((i: any) => i.item_id), ['2', '10']);
    assert.equal(items.body.data.phases.length, 4);
  });
});
test('constants item mapping, empty search and pagination', async () => {
  await host(async get => {
    const r = await get('/constants/items'); assert.equal(r.status, 200);
    assert.equal(r.body.data.items[0].item_id, '2'); assert.equal(r.body.data.items[0].description, 'Item text');
    const empty = await get('/constants/items?q=none'); assert.equal(empty.body.data.total, 0);
    const offset = await get('/constants/items?offset=100'); assert.equal(offset.body.data.has_more, false);
  });
});
test('rankings gated by default, score sorted and numeric ties when enabled', async () => {
  await host(async get => { assert.equal((await get('/heroes/1/rankings')).status, 501); });
  await host(async get => {
    const r = await get('/heroes/1/rankings'); assert.equal(r.status, 200);
    assert.deepEqual(r.body.data.items.map((i: any) => i.player.account_id), ['2', '10']);
    assert.equal(r.body.data.items[0].position, 1);
  }, { rankings: true });
});
test('search isolates requested sources and unverified match lookup', async () => {
  const f = await host(async get => {
    const h = await get('/search?q=alpha&type=hero'); assert.equal(h.status, 200); assert.equal(h.body.data.heroes.length, 1);
    const m = await get('/search?q=12345&type=match'); assert.deepEqual(m.body.data.match, { match_id: '12345', verified: false });
    const invalid = await get('/search?q=001&type=match'); assert.equal(invalid.body.data.match, null);
    const p = await get('/search?q=player&type=player'); assert.equal(p.body.data.players[0].account_id, '1');
    assert.equal((await get('/search?q=team&type=team')).status, 501);
    assert.equal((await get('/search?q=team')).status, 501);
  });
  assert.deepEqual(f.calls, ['/heroStats', '/search']);
});
test('search team injected service and aggregate oldest timestamp', async () => {
  await host(async get => {
    const r = await get('/search?q=Alpha&type=all&limit=2'); assert.equal(r.status, 200);
    assert.equal(r.body.data.teams.length, 0); assert.equal(r.body.meta.fetched_at, '2026-10-26T00:00:00Z');
  }, { teams: { async search(q, limit, opts) { assert.equal(q, 'Alpha'); assert.equal(limit, 2); assert.ok(opts.deadline_ms); return { data: [], fetched_at: '2026-10-26T00:00:00Z' }; } } });
});
test('upstream failures map to HTTP without leaking data or treating error as empty', async () => {
  for (const [kind, status] of [['timeout', 504], ['rate_limited', 429], ['invalid_response', 502], ['unavailable', 502]] as const) {
    await host(async get => {
      const r = await get('/heroes'); assert.equal(r.status, status); assert.ok(r.body.error);
      if (status === 429) { assert.equal(r.headers.get('retry-after'), '60'); assert.equal(r.body.error.retry_after_seconds, 60); }
    }, { overrides: { '/heroStats': new UpstreamError(kind) } });
  }
});
test('invalid upstream schema gives 502; not an empty successful result', async () => {
  await host(async get => { assert.equal((await get('/heroes')).status, 502); }, { overrides: { '/heroStats': [{}] } });
});
test('contract adapter namespaces caches and rejects elapsed absolute deadline', async () => {
  let calls = 0;
  const adapter = contractClient(new Transport({ fetch: (async () => { calls++; return Response.json({ id: 1 }); }) as typeof fetch }));
  const options = { validate: (raw: unknown) => raw, ttl_seconds: 60, cache_namespace: 'v1', deadline_ms: Date.now() + 10000 };
  await adapter.get('/heroes', undefined, options); await adapter.get('/heroes', undefined, options);
  await adapter.get('/heroes', undefined, { ...options, cache_namespace: 'v2' }); assert.equal(calls, 2);
  await assert.rejects(adapter.get('/heroes', undefined, { ...options, deadline_ms: Date.now() - 1 }), { kind: 'timeout' });
});
test('a short caller deadline does not abort a shared GET with a longer deadline', async () => {
  let calls = 0;
  const adapter = contractClient(new Transport({ fetch: (async () => {
    calls++; await new Promise(resolve => setTimeout(resolve, 40)); return Response.json({ id: 1 });
  }) as typeof fetch }));
  const options = { validate: (raw: unknown) => raw, ttl_seconds: 0, cache_namespace: 'deadline' };
  const short = adapter.get('/heroes', undefined, { ...options, deadline_ms: Date.now() + 10 });
  const long = adapter.get('/heroes', undefined, { ...options, deadline_ms: Date.now() + 1000 });
  await assert.rejects(short, { kind: 'timeout' });
  assert.deepEqual((await long).data, { id: 1 }); assert.equal(calls, 1);
});
test('team catalog searches all names/tags before limiting and sorts IDs numerically', async () => {
  const f = fake();
  const teams = createTeamCatalogSearch(f.client);
  const result = await teams.search(' SPIRIT ', 2, { deadline_ms: Date.now() + 10000 });
  assert.deepEqual(result.data.map(t => t.team_id), ['1', '2']);
  assert.equal(result.fetched_at, time);
  assert.equal(result.data[0].rating, null);
  assert.equal(result.data[0].region, null);
  assert.equal((await teams.search('missing', 5, { deadline_ms: Date.now() + 10000 })).data.length, 0);
  await assert.rejects(teams.search('x', 1, { deadline_ms: Date.now() + 10000 }));
});
test('team catalog malformed upstream and timeout propagate without fake results', async () => {
  for (const raw of [[{ team_id: 0, name: 'bad' }], new UpstreamError('timeout')]) {
    const teams = createTeamCatalogSearch(fake({ '/teams': raw }).client);
    await assert.rejects(teams.search('spirit', 5, { deadline_ms: Date.now() + 10000 }), { kind: raw instanceof Error ? 'timeout' : 'invalid_response' });
  }
});
test('Search all works with the real team adapter and fails atomically on a source error', async () => {
  const teams = createTeamCatalogSearch(fake().client);
  await host(async get => {
    const r = await get('/search?q=spirit'); assert.equal(r.status, 200);
    assert.deepEqual(r.body.data.teams.map((t: any) => t.team_id), ['1', '2', '10']);
    assert.equal(r.body.data.players[0].account_id, '1');
  }, { teams });
  await host(async get => { assert.equal((await get('/search?q=spirit')).status, 504); }, {
    teams: createTeamCatalogSearch(fake({ '/teams': new UpstreamError('timeout') }).client),
  });
});
test('search preserves 20-digit match IDs and validates Unicode length by code point', async () => {
  await host(async get => {
    const id = '12345678901234567890';
    const match = await get(`/search?q=${id}&type=match`);
    assert.equal(match.body.data.match.match_id, id);
    for (const count of [2, 80]) assert.equal((await get(`/search?q=${encodeURIComponent('😀'.repeat(count))}&type=match`)).status, 200);
    assert.equal((await get(`/search?q=${encodeURIComponent('😀'.repeat(81))}&type=match`)).status, 400);
    assert.equal((await get('/search?q=123456789012345678901&type=match')).body.data.match, null);
  });
});
test('catalog pagination has no overlap and sort desc honors numeric IDs', async () => {
  await host(async get => {
    const ids: string[] = [];
    for (let offset = 0; offset < 3; offset++) {
      const r = await get(`/heroes?sort=id&order=desc&limit=1&offset=${offset}`);
      ids.push(r.body.data.items[0].hero_id);
      assert.equal(r.body.data.has_more, offset < 2);
    }
    assert.deepEqual(ids, ['10', '2', '1']);
    assert.equal(new Set(ids).size, 3);
    assert.equal((await get('/heroes?offset=100')).body.data.items.length, 0);
  });
});
test('stats with impossible wins and matchups with invalid counts return 502', async () => {
  await host(async get => { assert.equal((await get('/heroes/stats')).status, 502); }, { overrides: { '/heroStats': [{ ...hero(1, 'Bad'), pro_pick: 1, pro_win: 2 }] } });
  await host(async get => { assert.equal((await get('/heroes/1/matchups')).status, 502); }, { overrides: { '/heroes/1/matchups': [{ hero_id: 2, games_played: 1, wins: 2 }] } });
});
test('missing ability mapping remains null and errors do not become null success', async () => {
  await host(async get => {
    const r = await get('/heroes/1'); assert.equal(r.status, 200);
    assert.equal(r.body.data.abilities, null);
    assert.ok(r.body.meta.unavailable_fields.includes('/data/abilities'));
  }, { overrides: { '/constants/abilities': {} } });
  await host(async get => { assert.equal((await get('/heroes/1')).status, 504); }, { overrides: { '/constants/abilities': new UpstreamError('timeout') } });
});
test('rankings schema rejects a response for another hero', async () => {
  await host(async get => { assert.equal((await get('/heroes/1/rankings')).status, 502); }, { rankings: true, overrides: { '/rankings': { hero_id: 2, rankings: [] } } });
});
test('unknown routes use the error envelope and request ID', async () => {
  await host(async get => {
    const r = await get('/nonexistent'); assert.equal(r.status, 404);
    assert.equal(r.body.error.code, 'NOT_FOUND');
    assert.equal(r.headers.get('x-request-id'), r.body.request_id);
    assert.equal(typeof r.body.request_id, 'string');
  });
});
test('dev CORS allows only configured web origins, including preflight', async () => {
  const server = createPart2App({ client: fake().client }).listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/heroes`;
  try {
    const allowed = await fetch(url, { headers: { Origin: 'http://localhost:8081' } });
    assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:8081');
    const denied = await fetch(url, { method: 'OPTIONS', headers: { Origin: 'https://untrusted.example' } });
    assert.equal(denied.status, 403); assert.equal(denied.headers.get('access-control-allow-origin'), null);
    const preflight = await fetch(url, { method: 'OPTIONS', headers: { Origin: 'http://localhost:8081' } });
    assert.equal(preflight.status, 204);
    const native = await fetch(url); assert.equal(native.status, 200);
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});
