import { UpstreamError } from './errors.ts';

interface Waiter { resolve: (release: () => void) => void; reject: (error: unknown) => void; signal: AbortSignal; abort: () => void }
export interface Limits { perMinute: number; perDay: number; concurrency: number; maxQueue: number }

/** One process-wide instance; rolling budgets count every HTTP attempt, including retries. */
export class RateLimiter {
  private active = 0;
  private queue: Waiter[] = [];
  private attempts: number[] = [];
  private blockedUntil = 0;
  private limits: Limits;
  constructor(limits: Limits) {
    for (const [key, value] of Object.entries(limits)) {
      if (!Number.isSafeInteger(value) || value < (key === 'maxQueue' ? 0 : 1)) throw new Error(`Invalid limit: ${key}`);
    }
    this.limits = limits;
  }
  block(seconds: number): void { this.blockedUntil = Math.max(this.blockedUntil, Date.now() + seconds * 1000); }
  private reserve(): void {
    const now = Date.now();
    this.attempts = this.attempts.filter(time => time > now - 86400000);
    const minute = this.attempts.filter(time => time > now - 60000);
    const wait = Math.max(this.blockedUntil - now,
      this.attempts.length >= this.limits.perDay ? this.attempts[0]! + 86400000 - now : 0,
      minute.length >= this.limits.perMinute ? minute[0]! + 60000 - now : 0);
    if (wait > 0) throw new UpstreamError('rate_limited', null, Math.ceil(wait / 1000));
    this.attempts.push(now);
  }
  private lease(): () => void {
    this.reserve();
    this.active++;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.active--;
      this.drain();
    };
  }
  private drain(): void {
    while (this.active < this.limits.concurrency && this.queue.length) {
      const waiter = this.queue.shift()!;
      waiter.signal.removeEventListener('abort', waiter.abort);
      if (waiter.signal.aborted) { waiter.reject(waiter.signal.reason); continue; }
      try { waiter.resolve(this.lease()); } catch (error) { waiter.reject(error); }
    }
  }
  acquire(signal: AbortSignal): Promise<() => void> {
    if (signal.aborted) return Promise.reject(signal.reason);
    if (this.active < this.limits.concurrency) {
      try { return Promise.resolve(this.lease()); } catch (error) { return Promise.reject(error); }
    }
    if (this.queue.length >= this.limits.maxQueue) return Promise.reject(new UpstreamError('rate_limited', null, 1));
    return new Promise((resolve, reject) => {
      const waiter: Waiter = { resolve, reject, signal, abort: () => {
        this.queue = this.queue.filter(entry => entry !== waiter);
        reject(signal.reason);
      } };
      this.queue.push(waiter);
      signal.addEventListener('abort', waiter.abort, { once: true });
    });
  }
}
