export type UpstreamErrorKind = 'not_found' | 'rate_limited' | 'timeout' | 'unavailable' | 'invalid_response';

export class UpstreamError extends Error {
  readonly kind: UpstreamErrorKind;
  readonly status: number | null;
  readonly retry_after_seconds: number | null;
  constructor(kind: UpstreamErrorKind, status: number | null = null, retryAfter: number | null = null) {
    // Never include upstream URL, body or credentials in error messages.
    super(`OpenDota ${kind}`);
    this.name = 'UpstreamError';
    this.kind = kind;
    this.status = status;
    this.retry_after_seconds = retryAfter;
  }
}

export function parseRetryAfter(value: string | null, now = Date.now()): number | null {
  if (!value) return null;
  const seconds = /^\d+$/.test(value) ? Number(value) : (Date.parse(value) - now) / 1000;
  return Number.isFinite(seconds) ? Math.max(0, Math.ceil(seconds)) : null;
}
