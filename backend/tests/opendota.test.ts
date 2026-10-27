import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OpenDotaClient, RateLimiter, MemoryCache, UpstreamError, createOpenDotaClient } from '../src/integrations/opendota/index.ts';
import { defaultTtl } from '../src/integrations/opendota/cache.ts';
import { parseRetryAfter } from '../src/integrations/opendota/errors.ts';

const parse = (value: unknown): { id: number } => {
  if (!value || typeof value !== 'object' || !('id' in value) || typeof value.id !== 'number') throw new Error('bad');
  return { id: value.id };
};
const json = (value: unknown) => Response.json(value);
const unlimited = (concurrency = 2, maxQueue = 50) => new RateLimiter({ perMinute: 1000, perDay: 1000, concurrency, maxQueue });
function fixture(handler: (url: URL, init: RequestInit) => Promise<Response> | Response, extra: ConstructorParameters<typeof OpenDotaClient>[0] = {}) {
  let calls = 0;
  const client = new OpenDotaClient({ limiter: unlimited(), retryDelayMs: () => 0,
    fetch: (async (input, init) => { calls++; return handler(new URL(String(input)), init!); }) as typeof fetch, ...extra });
  return { client, calls: () => calls };
}

test('validates before caching; preserves fetched_at and isolates mutations', async () => {
  const f = fixture(() => json({ id: 1 }));
  const first = await f.client.getWithMeta('/heroes', {}, { validate: parse });
  first.data.id = 99;
  const second = await f.client.getWithMeta('/heroes', {}, { validate: parse });
  assert.equal(second.data.id, 1);
  assert.equal(second.fetched_at, first.fetched_at);
  assert.equal(second.cache_hit, true);
  assert.equal(f.calls(), 1);
});
test('does not cache unvalidated or schema-invalid responses', async () => {
  const f = fixture(() => json({ wrong: 1 }));
  await f.client.get('/heroes');
  await assert.rejects(f.client.get('/heroes', {}, { validate: parse }), { kind: 'invalid_response' });
  await assert.rejects(f.client.get('/heroes', {}, { validate: parse }), { kind: 'invalid_response' });
  assert.equal(f.calls(), 3);
});
test('deduplicates equivalent sorted query and validates each consumer separately', async () => {
  const f = fixture(async () => { await new Promise(resolve => setTimeout(resolve, 10)); return json({ id: 1 }); });
  const results = await Promise.all([f.client.get('/search', { q: 'a', limit: 5 }, { validate: parse }), f.client.get('/search', { limit: 5, q: 'a' }, { validate: v => ({ transformed: parse(v).id }) })]);
  assert.deepEqual(results, [{ id: 1 }, { transformed: 1 }]);
  assert.equal(f.calls(), 1);
});
test('caller abort does not cancel shared transport', async () => {
  const f = fixture(async () => { await new Promise(resolve => setTimeout(resolve, 15)); return json({ id: 1 }); });
  const controller = new AbortController();
  const a = f.client.get('/heroes', {}, { signal: controller.signal });
  const b = f.client.get('/heroes');
  controller.abort();
  await assert.rejects(a, { name: 'AbortError' });
  assert.deepEqual(await b, { id: 1 });
  assert.equal(f.calls(), 1);
});
test('retries transient GET exactly once', async () => {
  let attempts = 0;
  const f = fixture(() => ++attempts === 1 ? new Response('', { status: 503 }) : json({ id: 1 }));
  assert.deepEqual(await f.client.get('/heroes'), { id: 1 });
  assert.equal(f.calls(), 2);
});
test('network errors retry once and never disclose credentials', async () => {
  const f = fixture(() => { throw new TypeError('secret api_key=abc'); }, { apiKey: 'abc' });
  await assert.rejects(f.client.get('/heroes'), error => error instanceof UpstreamError && !String(error).includes('abc'));
  assert.equal(f.calls(), 2);
});
test('POST never retries or caches', async () => {
  const f = fixture((_url, init) => { assert.equal(init.method, 'POST'); assert.equal(init.body, '{}'); return new Response('', { status: 503 }); });
  await assert.rejects(f.client.post('/request/123'), { kind: 'unavailable', status: 503 });
  assert.equal(f.calls(), 1);
});
test('404 and 400 do not retry', async () => {
  for (const status of [404, 400]) {
    const f = fixture(() => new Response('', { status }));
    await assert.rejects(f.client.get('/heroes'), { kind: status === 404 ? 'not_found' : 'unavailable', status });
    assert.equal(f.calls(), 1);
  }
});
test('429 honors retry-after across other requests without retry', async () => {
  const f = fixture(() => new Response('', { status: 429, headers: { 'Retry-After': '30' } }));
  await assert.rejects(f.client.get('/heroes'), { kind: 'rate_limited', retry_after_seconds: 30 });
  await assert.rejects(f.client.get('/teams'), { kind: 'rate_limited' });
  assert.equal(f.calls(), 1);
});
test('invalid JSON is not retried or cached', async () => {
  const f = fixture(() => new Response('not-json'));
  await assert.rejects(f.client.get('/heroes'), { kind: 'invalid_response' });
  assert.equal(f.calls(), 1);
});
test('timeout aborts fetch and maps timeout', async () => {
  const f = fixture((_url, init) => new Promise((_resolve, reject) => {
    init.signal!.addEventListener('abort', () => reject(init.signal!.reason), { once: true });
  }), { timeoutMs: 10 });
  // Keep event loop alive: AbortSignal.timeout timers are unrefed by Node.
  const keepAlive = setTimeout(() => {}, 1000);
  try { await assert.rejects(f.client.get('/heroes'), { kind: 'timeout' }); }
  finally { clearTimeout(keepAlive); }
});
test('rejects URL injection and non-finite query values before fetch', async () => {
  const f = fixture(() => json({}));
  for (const path of ['https://evil.test', '//evil.test', '/../heroes', '/%2e%2e/heroes', '/heroes?api_key=x', '/heroes#x', '/heroes\\bad']) await assert.rejects(f.client.get(path));
  await assert.rejects(f.client.get('/heroes', { api_key: 'x' }));
  await assert.rejects(f.client.get('/heroes', { n: Infinity }));
  assert.equal(f.calls(), 0);
});
test('dispatch attaches key only to fixed host and disables redirects', async () => {
  const f = fixture((url, init) => {
    assert.equal(url.origin, 'https://api.opendota.com');
    assert.equal(url.searchParams.get('api_key'), 'secret');
    assert.equal(init.redirect, 'error');
    return json({ id: 1 });
  }, { apiKey: 'secret' });
  await f.client.get('/heroes');
});
test('cache TTL, eviction and zero TTL', () => {
  const cache = new MemoryCache(1);
  cache.set('a', 1, 1, 1000);
  assert.equal(cache.get('a', 1999)?.value, 1);
  assert.equal(cache.get('a', 2000), undefined);
  cache.set('a', 1, 10, 1000); cache.set('b', 2, 10, 1000);
  assert.equal(cache.get('a', 1001), undefined);
  cache.set('c', 3, 0, 1000);
  assert.equal(cache.get('c', 1001), undefined);
  assert.equal(defaultTtl('/request/123'), 0);
  assert.equal(defaultTtl('/heroStats'), 3600);
});
test('quota counts retries', async () => {
  const f = fixture(() => new Response('', { status: 503 }), { limiter: new RateLimiter({ perMinute: 1, perDay: 10, concurrency: 1, maxQueue: 1 }) });
  await assert.rejects(f.client.get('/heroes'), { kind: 'rate_limited' });
  assert.equal(f.calls(), 1);
});
test('daily quota rejects with retry time', async () => {
  const limiter = new RateLimiter({ perMinute: 100, perDay: 1, concurrency: 1, maxQueue: 1 });
  const release = await limiter.acquire(new AbortController().signal); release();
  await assert.rejects(limiter.acquire(new AbortController().signal), error => error instanceof UpstreamError && error.retry_after_seconds! > 86000);
});
test('concurrency queue is bounded and cancel removes queued waiter', async () => {
  const limiter = unlimited(1, 1);
  const release = await limiter.acquire(new AbortController().signal);
  const controller = new AbortController();
  const queued = limiter.acquire(controller.signal);
  await assert.rejects(limiter.acquire(new AbortController().signal), { kind: 'rate_limited' });
  controller.abort(); await assert.rejects(queued);
  const next = limiter.acquire(new AbortController().signal);
  release(); (await next)();
});
test('deadline includes queue waiting', async () => {
  const limiter = unlimited(1);
  const release = await limiter.acquire(new AbortController().signal);
  const f = fixture(() => json({}), { limiter, deadlineMs: 10 });
  const keepAlive = setTimeout(() => {}, 1000);
  try { await assert.rejects(f.client.get('/heroes'), { kind: 'timeout' }); assert.equal(f.calls(), 0); }
  finally { release(); clearTimeout(keepAlive); }
});
test('env validation and retry-after date', () => {
  assert.throws(() => createOpenDotaClient({ OPENDOTA_CONCURRENCY: '0' }));
  assert.equal(parseRetryAfter('nonsense'), null);
  assert.equal(parseRetryAfter('Thu, 01 Jan 1970 00:01:00 GMT', 30000), 30);
});
