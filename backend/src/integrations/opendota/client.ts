import { MemoryCache, defaultTtl } from './cache.ts';
import { UpstreamError, parseRetryAfter } from './errors.ts';
import { RateLimiter } from './rate-limiter.ts';

export type Query = Record<string, string | number | boolean>;
export interface GetOptions<T> {
  deadline_ms?: number;
  cache_namespace?: string;
  ttl_seconds?: number;
  signal?: AbortSignal;
  /** Runtime parser, e.g. value => schema.parse(value). Required to cache a response. */
  validate?: (value: unknown) => T;
}
export interface Result<T> { data: T; fetched_at: string; cache_hit: boolean }
export interface ClientOptions {
  apiKey?: string; fetch?: typeof fetch; limiter?: RateLimiter; cache?: MemoryCache;
  timeoutMs?: number; deadlineMs?: number; retryDelayMs?: () => number;
}

function wait<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(signal.reason); return; }
    const abort = () => reject(signal.reason);
    signal.addEventListener('abort', abort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}

export class OpenDotaClient {
  private fetcher: typeof fetch;
  private limiter: RateLimiter;
  private cache: MemoryCache;
  private options: ClientOptions;
  // Deduplicate raw transport; each caller validates independently before caching.
  private inFlight = new Map<string, Promise<Result<unknown>>>();
  constructor(options: ClientOptions = {}) {
    this.options = options;
    this.fetcher = options.fetch ?? fetch;
    this.limiter = options.limiter ?? new RateLimiter({ perMinute: 30, perDay: 900, concurrency: 2, maxQueue: 50 });
    this.cache = options.cache ?? new MemoryCache();
    for (const value of [options.timeoutMs ?? 8000, options.deadlineMs ?? 20000]) {
      if (!Number.isSafeInteger(value) || value < 1) throw new Error('Invalid timeout');
    }
  }
  private url(path: string, query: Query = {}): URL {
    // Accept path segments only. Disallow traversal, encoding, credentials, query and fragments.
    if (!/^\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(path)) throw new Error('Invalid OpenDota path');
    const url = new URL(`https://api.opendota.com/api${path}`);
    for (const key of Object.keys(query).sort()) {
      const value = query[key]!;
      if (key.toLowerCase() === 'api_key' || !['string', 'number', 'boolean'].includes(typeof value) || (typeof value === 'number' && !Number.isFinite(value))) throw new Error('Invalid OpenDota query');
      url.searchParams.set(key, String(value));
    }
    return url;
  }
  async get<T = unknown>(path: string, query: Query = {}, options: GetOptions<T> = {}): Promise<T> {
    return (await this.getWithMeta(path, query, options)).data;
  }
  async getWithMeta<T = unknown>(path: string, query: Query = {}, options: GetOptions<T> = {}): Promise<Result<T>> {
    options.signal?.throwIfAborted();
    if (options.deadline_ms !== undefined && options.deadline_ms <= Date.now()) throw new UpstreamError('timeout');
    const callerSignal = options.deadline_ms === undefined ? options.signal : AbortSignal.any([
      AbortSignal.timeout(Math.max(1, options.deadline_ms - Date.now())), ...(options.signal ? [options.signal] : []),
    ]);
    const url = this.url(path, query);
    const key = JSON.stringify([options.cache_namespace ?? 'legacy', url.pathname, url.search]);
    const ttl = options.ttl_seconds ?? defaultTtl(path);
    if (!Number.isFinite(ttl) || ttl < 0) throw new Error('Invalid cache TTL');
    const cached = ttl > 0 && options.validate ? this.cache.get<unknown>(key) : undefined;
    if (cached) {
      try { return { data: options.validate!(cached.value), fetched_at: cached.fetched_at, cache_hit: true }; }
      catch { throw new UpstreamError('invalid_response'); }
    }
    let pending = this.inFlight.get(key);
    if (!pending) {
      // Shared transport has its own bounded lifetime; one caller's shorter deadline
      // must not abort the same fetch awaited by another request.
      pending = this.request('GET', url);
      this.inFlight.set(key, pending);
      const current = pending;
      void pending.finally(() => { if (this.inFlight.get(key) === current) this.inFlight.delete(key); }).catch(() => {});
    }
    // Caller cancellation must not abort another caller's shared upstream request.
    let result: Result<unknown>;
    try { result = callerSignal ? await wait(pending, callerSignal) : await pending; }
    catch (error) { if (callerSignal?.aborted && !options.signal?.aborted) throw new UpstreamError('timeout'); throw error; }
    let data: T;
    try { data = options.validate ? options.validate(structuredClone(result.data)) : structuredClone(result.data) as T; }
    catch { throw new UpstreamError('invalid_response'); }
    if (options.validate && ttl > 0) this.cache.set(key, result.data, ttl, Date.parse(result.fetched_at));
    return { data, fetched_at: result.fetched_at, cache_hit: false };
  }
  async post<T = unknown>(path: string, body?: Record<string, unknown>, options: GetOptions<T> = {}): Promise<T> {
    return (await this.postWithMeta(path, body, options)).data;
  }
  async postWithMeta<T = unknown>(path: string, body?: Record<string, unknown>, options: GetOptions<T> = {}): Promise<Result<T>> {
    const result = await this.request('POST', this.url(path), body, options.deadline_ms, options.signal);
    try { return { ...result, data: options.validate ? options.validate(result.data) : result.data as T }; }
    catch { throw new UpstreamError('invalid_response'); }
  }
  private async request(method: 'GET' | 'POST', url: URL, body?: Record<string, unknown>, deadlineMs?: number, callerSignal?: AbortSignal): Promise<Result<unknown>> {
    if (deadlineMs !== undefined && deadlineMs <= Date.now()) throw new UpstreamError('timeout');
    const deadline = AbortSignal.any([AbortSignal.timeout(Math.min(this.options.deadlineMs ?? 20000, Math.max(1, (deadlineMs ?? Date.now() + 20000) - Date.now()))), ...(callerSignal ? [callerSignal] : [])]);
    if (this.options.apiKey) url.searchParams.set('api_key', this.options.apiKey);
    for (let attempt = 0; ; attempt++) {
      let release: (() => void) | undefined;
      let retry = false;
      try {
        release = await this.limiter.acquire(deadline);
        const signal = AbortSignal.any([deadline, AbortSignal.timeout(this.options.timeoutMs ?? 8000)]);
        const response = await this.fetcher(url, {
          method, signal, redirect: 'error', headers: { Accept: 'application/json', ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}) },
          ...(method === 'POST' ? { body: JSON.stringify(body ?? {}) } : {}),
        });
        if (!response.ok) {
          const retryAfter = parseRetryAfter(response.headers.get('retry-after'));
          if (response.status === 429) this.limiter.block(retryAfter ?? 60);
          await response.body?.cancel();
          retry = [502, 503, 504].includes(response.status);
          throw new UpstreamError(response.status === 404 ? 'not_found' : response.status === 429 ? 'rate_limited' : 'unavailable', response.status, retryAfter);
        }
        let data: unknown;
        try { data = await response.json(); }
        catch { if (signal.aborted) throw new UpstreamError('timeout'); throw new UpstreamError('invalid_response', response.status); }
        return { data, fetched_at: new Date().toISOString(), cache_hit: false };
      } catch (error) {
        if (deadline.aborted) throw new UpstreamError('timeout');
        const normalized = error instanceof UpstreamError ? error : new UpstreamError(error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name) ? 'timeout' : 'unavailable');
        retry ||= !(error instanceof UpstreamError) && normalized.kind === 'unavailable';
        if (method !== 'GET' || attempt >= 1 || !retry) throw normalized;
      } finally { release?.(); }
      const delay = this.options.retryDelayMs?.() ?? 250 + Math.floor(Math.random() * 501);
      try {
        await wait(new Promise<void>(resolve => { const timer = setTimeout(resolve, delay); deadline.addEventListener('abort', () => clearTimeout(timer), { once: true }); }), deadline);
      } catch { throw new UpstreamError('timeout'); }
    }
  }
}
