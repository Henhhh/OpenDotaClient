import { randomUUID } from "node:crypto";
import { z } from "zod";
import type {
  Request,
  Response,
  NextFunction,
  RequestHandler,
  ErrorRequestHandler,
} from "express";
import type { ErrorCode, Page, Success } from "../../../shared/api-contract.ts";
import { UpstreamError } from "../integrations/opendota/errors.ts";

export class ApiError extends Error {
  status: number;
  code: ErrorCode;
  retry_after_seconds: number | null;
  constructor(
    status: number,
    code: ErrorCode,
    message: string,
    retryAfter: number | null = null,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.retry_after_seconds = retryAfter;
  }
}
export interface Context {
  deadline_ms: number;
  signal: AbortSignal;
}
export interface ServiceResult<T> {
  data: T;
  fetched_at: string;
  source: Success<T>["meta"]["source"];
}
function isUpstreamError(value: unknown): value is UpstreamError {
  return (
    value instanceof UpstreamError ||
    (value instanceof Error &&
      value.name === "UpstreamError" &&
      z
        .object({
          kind: z.enum([
            "not_found",
            "rate_limited",
            "timeout",
            "unavailable",
            "invalid_response",
          ]),
          retry_after_seconds: z.number().finite().nonnegative().nullable(),
          status: z.number().int().nullable(),
        })
        .safeParse(value).success)
  );
}
export const numericId = z.string().regex(/^[1-9][0-9]{0,19}$/);
export const accountId = numericId.pipe(
  z
    .string()
    .refine((id) => BigInt(id) <= 4294967295n, "Account ID must fit uint32"),
);
export const opaqueId = z.string().min(1).max(128);
export const empty = z.object({}).strict();
export const unixSeconds = z
  .string()
  .regex(/^(0|[1-9]\d*)$/)
  .transform(Number)
  .pipe(z.number().int().nonnegative().safe());
export const dateRange = z
  .object({ from: unixSeconds.optional(), to: unixSeconds.optional() })
  .strict()
  .refine(
    (value) =>
      value.from === undefined ||
      value.to === undefined ||
      value.from < value.to,
    { message: "from must be less than to", path: ["to"] },
  );
export function body<S extends z.ZodType>(
  req: Request,
  schema: S,
): z.output<S> {
  if (!req.is("application/json"))
    throw new ApiError(400, "VALIDATION_ERROR", "JSON body required");
  return schema.parse(req.body);
}
const integerQuery = (min: number, max: number, fallback: string) =>
  z
    .string()
    .regex(/^(0|[1-9]\d*)$/)
    .default(fallback)
    .transform(Number)
    .pipe(z.number().int().min(min).max(max));
export const pagination = {
  limit: integerQuery(1, 100, "20"),
  offset: integerQuery(0, 10000, "0"),
};
export const searchLimit = integerQuery(1, 20, "5");
export const text = (min = 1) =>
  z
    .string()
    .trim()
    .refine(
      (s) => [...s].length >= min && [...s].length <= 80,
      "Invalid text length",
    );
export const compareId = (a: string, b: string) =>
  a.length - b.length || a.localeCompare(b);
export function page<T>(rows: T[], limit: number, offset: number): Page<T> {
  return {
    items: rows.slice(offset, offset + limit),
    limit,
    offset,
    total: rows.length,
    has_more: offset + limit < rows.length,
  };
}
export function query<S extends z.ZodType>(
  req: Request,
  schema: S,
): z.output<S> {
  // URLSearchParams preserves duplicate keys, unlike configurable Express parsers.
  const params = new URL(req.originalUrl, "http://local").searchParams;
  const raw: Record<string, string> = {};
  for (const [key, value] of params) {
    if (Object.hasOwn(raw, key))
      throw new ApiError(400, "VALIDATION_ERROR", `Repeated query: ${key}`);
    Object.defineProperty(raw, key, { value, enumerable: true });
  }
  return schema.parse(raw);
}
export function unavailable(value: unknown, pointer = "/data"): string[] {
  if (value === null) return [pointer];
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, val]) =>
    unavailable(
      val,
      `${pointer}/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`,
    ),
  );
}
export function endpoint<T>(
  handler: (req: Request, context: Context) => Promise<ServiceResult<T>>,
  successStatus: 200 | 202 = 200,
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const controller = new AbortController();
    const abort = () => {
      if (!res.writableEnded)
        controller.abort(
          new ApiError(504, "UPSTREAM_TIMEOUT", "Request cancelled"),
        );
    };
    res.on("close", abort);
    res.locals.request_id ??= randomUUID();
    res.setHeader("X-Request-Id", res.locals.request_id);
    const deadline_ms = res.locals.deadline_ms ?? Date.now() + 20000;
    const signal: AbortSignal =
      res.locals.request_context?.signal ?? controller.signal;
    const timeout = setTimeout(
      () =>
        controller.abort(
          new ApiError(504, "UPSTREAM_TIMEOUT", "Request deadline exceeded"),
        ),
      Math.max(0, deadline_ms - Date.now()),
    );
    let onAbort: () => void = () => {};
    try {
      if (signal.aborted) throw signal.reason;
      if (Date.now() >= deadline_ms)
        throw new ApiError(
          504,
          "UPSTREAM_TIMEOUT",
          "Request deadline exceeded",
        );
      const cancelled = new Promise<never>((_resolve, reject) => {
        onAbort = () =>
          reject(
            signal.reason ??
              new ApiError(504, "UPSTREAM_TIMEOUT", "Request cancelled"),
          );
        signal.addEventListener("abort", onAbort, { once: true });
      });
      const result = await Promise.race([
        handler(req, { deadline_ms, signal }),
        cancelled,
      ]);
      if (res.writableEnded || res.destroyed) return;
      const body: Success<T> = {
        data: result.data,
        meta: {
          request_id: res.locals.request_id,
          fetched_at: result.fetched_at,
          source: result.source,
          stale: false,
          unavailable_fields: unavailable(result.data),
        },
      };
      res.status(successStatus).json(body);
    } catch (error) {
      if (!res.destroyed && !res.writableEnded) next(error);
    } finally {
      clearTimeout(timeout);
      signal.removeEventListener("abort", onAbort);
      res.off("close", abort);
    }
  };
}
/** One error envelope for every module, including parser errors and unknown routes. */
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (res.headersSent) return;
  const id = res.locals.request_id ?? randomUUID();
  let status = 500;
  let code: ErrorCode = "INTERNAL_ERROR";
  let message = "Internal error";
  let retry: number | null = null;
  let details: { field: string; message: string }[] = [];
  if (error instanceof z.ZodError) {
    status = 400;
    code = "VALIDATION_ERROR";
    message = "Invalid input";
    details = error.issues.map((i) => ({
      field: i.path.join("."),
      message: i.message,
    }));
  } else if (error instanceof ApiError) {
    ({ status, code, message } = error);
    if (status === 429) retry = error.retry_after_seconds;
  } else if (isUpstreamError(error)) {
    status =
      error.kind === "not_found"
        ? 404
        : error.kind === "rate_limited"
          ? 429
          : error.kind === "timeout"
            ? 504
            : 502;
    code =
      status === 404
        ? "NOT_FOUND"
        : status === 429
          ? "RATE_LIMITED"
          : status === 504
            ? "UPSTREAM_TIMEOUT"
            : "UPSTREAM_ERROR";
    message = "OpenDota request failed";
    if (status === 429) retry = error.retry_after_seconds;
  } else if (
    error &&
    [
      "entity.parse.failed",
      "entity.too.large",
      "encoding.unsupported",
      "charset.unsupported",
      "request.aborted",
      "request.size.invalid",
    ].includes(error.type)
  ) {
    status = 400;
    code = "VALIDATION_ERROR";
    message = "Invalid JSON body";
  }
  if (status === 429)
    retry =
      typeof retry === "number" && Number.isFinite(retry)
        ? Math.max(1, Math.ceil(retry))
        : 60;
  res.setHeader("X-Request-Id", id);
  if (retry !== null) res.setHeader("Retry-After", retry);
  res.status(status).json({
    error: { code, message, details, retry_after_seconds: retry },
    request_id: id,
  });
};
