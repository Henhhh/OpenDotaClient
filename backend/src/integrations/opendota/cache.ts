export interface CacheEntry<T> { value: T; fetched_at: string; expires_at: number }

/** Bounded in-memory cache. Values are copied to prevent cross-request mutation. */
export class MemoryCache {
  private entries = new Map<string, CacheEntry<unknown>>();
  private capacity: number;
  constructor(capacity = 500) {
    if (!Number.isInteger(capacity) || capacity < 1) throw new Error('Invalid cache capacity');
    this.capacity = capacity;
  }
  get<T>(key: string, now = Date.now()): CacheEntry<T> | undefined {
    const entry = this.entries.get(key);
    if (!entry) return;
    if (entry.expires_at <= now) { this.entries.delete(key); return; }
    this.entries.delete(key);
    this.entries.set(key, entry);
    return structuredClone(entry) as CacheEntry<T>;
  }
  set<T>(key: string, value: T, ttlSeconds: number, now = Date.now()): void {
    if (ttlSeconds <= 0) return;
    this.entries.delete(key);
    for (const [k, entry] of this.entries) if (entry.expires_at <= now) this.entries.delete(k);
    if (this.entries.size >= this.capacity) this.entries.delete(this.entries.keys().next().value!);
    this.entries.set(key, { value: structuredClone(value), fetched_at: new Date(now).toISOString(), expires_at: now + ttlSeconds * 1000 });
  }
  clear(): void { this.entries.clear(); }
}

export function defaultTtl(path: string): number {
  if (/^\/request(?:\/|$)/.test(path)) return 0;
  if (path === '/live') return 30;
  if (/^\/constants(?:\/|$)/.test(path)) return 86400;
  if (/^\/(heroes|heroStats|rankings)(?:\/|$)/.test(path)) return 3600;
  if (/^\/(players|teams|leagues)(?:\/[^/]+)?$/.test(path)) return 300;
  return 60;
}
