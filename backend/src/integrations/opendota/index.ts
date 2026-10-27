import { OpenDotaClient } from './client.ts';
import { RateLimiter } from './rate-limiter.ts';
import type { OpenDotaClient as ContractClient } from '../../../../shared/api-contract.ts';
export { OpenDotaClient } from './client.ts';
export type { ClientOptions, GetOptions, Query, Result } from './client.ts';
export { UpstreamError } from './errors.ts';
export type { UpstreamErrorKind } from './errors.ts';
export { MemoryCache } from './cache.ts';
export { RateLimiter } from './rate-limiter.ts';

function positiveInt(env: NodeJS.ProcessEnv, key: string, fallback: number): number {
  const raw = env[key];
  if (raw === undefined) return fallback;
  if (!/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(Number(raw))) throw new Error(`Invalid ${key}`);
  return Number(raw);
}
export function createOpenDotaClient(env: NodeJS.ProcessEnv = process.env): OpenDotaClient {
  return new OpenDotaClient({
    apiKey: env.OPENDOTA_API_KEY,
    limiter: new RateLimiter({
      perMinute: positiveInt(env, 'OPENDOTA_REQUESTS_PER_MINUTE', 30),
      perDay: positiveInt(env, 'OPENDOTA_REQUESTS_PER_DAY', 900),
      concurrency: positiveInt(env, 'OPENDOTA_CONCURRENCY', 2), maxQueue: 50,
    }),
  });
}
let singleton: OpenDotaClient | undefined;
/** All modules must use this shared instance to share quota/cache. */
export function getOpenDotaClient(): OpenDotaClient { return singleton ??= createOpenDotaClient(); }

/** Contract interface for all new modules; legacy transport API stays compatible. */
export function contractClient(client = getOpenDotaClient()): ContractClient {
  return {
    get: (path, query, options) => client.getWithMeta(path, query, options),
    post: (path, body, options) => client.postWithMeta(path, body, options),
  };
}
