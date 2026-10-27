import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Request, Response, NextFunction, RequestHandler, ErrorRequestHandler } from 'express';
import type { ErrorCode, Page, Success } from '../../../../shared/api-contract.ts';
import { UpstreamError } from '../../integrations/opendota/errors.ts';

export class ApiError extends Error {
  status: number; code: ErrorCode;
  constructor(status: number, code: ErrorCode, message: string) { super(message); this.status = status; this.code = code; }
}
export interface Context { deadline_ms: number; signal: AbortSignal }
export interface ServiceResult<T> { data: T; fetched_at: string; source: Success<T>['meta']['source'] }
export const numericId = z.string().regex(/^[1-9][0-9]{0,19}$/);
const integerQuery = (min: number, max: number, fallback: string) => z.string().regex(/^(0|[1-9]\d*)$/).default(fallback).transform(Number).pipe(z.number().int().min(min).max(max));
export const pagination = { limit: integerQuery(1, 100, '20'), offset: integerQuery(0, 10000, '0') };
export const searchLimit = integerQuery(1, 20, '5');
export const text = (min = 1) => z.string().trim().refine(s => [...s].length >= min && [...s].length <= 80, 'Invalid text length');
export const compareId = (a: string, b: string) => a.length - b.length || a.localeCompare(b);
export function page<T>(rows: T[], limit: number, offset: number): Page<T> {
  return { items: rows.slice(offset, offset + limit), limit, offset, total: rows.length, has_more: offset + limit < rows.length };
}
export function query<S extends z.ZodType>(req: Request, schema: S): z.output<S> {
  // URLSearchParams preserves duplicate keys, unlike configurable Express parsers.
  const params = new URL(req.originalUrl, 'http://local').searchParams;
  const raw: Record<string, string> = {};
  for (const [key, value] of params) {
    if (Object.hasOwn(raw, key)) throw new ApiError(400, 'VALIDATION_ERROR', `Repeated query: ${key}`);
    Object.defineProperty(raw, key, { value, enumerable: true });
  }
  return schema.parse(raw);
}
export function unavailable(value: unknown, pointer = '/data'): string[] {
  if (value === null) return [pointer];
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, val]) => unavailable(val, `${pointer}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`));
}
export function endpoint<T>(handler: (req: Request, context: Context) => Promise<ServiceResult<T>>): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const controller = new AbortController();
    const abort = () => { if (!res.writableEnded) controller.abort(); };
    res.on('close', abort);
    res.locals.request_id ??= randomUUID();
    res.setHeader('X-Request-Id', res.locals.request_id);
    try {
      const result = await handler(req, { deadline_ms: res.locals.deadline_ms ?? Date.now() + 20000, signal: controller.signal });
      const body: Success<T> = { data: result.data, meta: { request_id: res.locals.request_id, fetched_at: result.fetched_at, source: result.source, stale: false, unavailable_fields: unavailable(result.data) } };
      res.json(body);
    } catch (error) { next(error); }
    finally { res.off('close', abort); }
  };
}
/** Standalone development error helper; core owner may replace with equivalent middleware. */
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (res.headersSent) return;
  const id = res.locals.request_id ?? randomUUID();
  let status = 500; let code: ErrorCode = 'INTERNAL_ERROR'; let message = 'Internal error'; let retry: number | null = null;
  let details: { field: string; message: string }[] = [];
  if (error instanceof z.ZodError) { status = 400; code = 'VALIDATION_ERROR'; message = 'Invalid input'; details = error.issues.map(i => ({ field: i.path.join('.'), message: i.message })); }
  else if (error instanceof ApiError) { ({ status, code, message } = error); }
  else if (error instanceof UpstreamError || (error && error.name === 'UpstreamError')) {
    status = error.kind === 'not_found' ? 404 : error.kind === 'rate_limited' ? 429 : error.kind === 'timeout' ? 504 : 502;
    code = status === 404 ? 'NOT_FOUND' : status === 429 ? 'RATE_LIMITED' : status === 504 ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_ERROR';
    message = 'OpenDota request failed';
    if (status === 429) retry = Math.max(1, error.retry_after_seconds ?? 60);
  }
  res.setHeader('X-Request-Id', id);
  if (retry !== null) res.setHeader('Retry-After', retry);
  res.status(status).json({ error: { code, message, details, retry_after_seconds: retry }, request_id: id });
};
