import express from "express";
import type { RequestHandler } from "express";
import { randomUUID } from "node:crypto";
import { ApiError, errorHandler, type Context } from "./http.ts";

export function requestContext(timeoutMs = 20000): RequestHandler {
  return (req, res, next) => {
    const controller = new AbortController();
    const context: Context = {
      deadline_ms: Date.now() + timeoutMs,
      signal: controller.signal,
    };
    res.locals.request_id = randomUUID();
    res.locals.deadline_ms = context.deadline_ms;
    res.locals.request_context = context;
    res.setHeader("X-Request-Id", res.locals.request_id);
    const timer = setTimeout(() => {
      const error = new ApiError(
        504,
        "UPSTREAM_TIMEOUT",
        "Request deadline exceeded",
      );
      controller.abort(error);
      if (!res.headersSent && !res.destroyed)
        errorHandler(error, req, res, next);
    }, timeoutMs);
    const finish = () => {
      clearTimeout(timer);
      res.off("finish", finish);
      res.off("close", close);
    };
    const close = () => {
      if (!res.writableEnded)
        controller.abort(
          new ApiError(504, "UPSTREAM_TIMEOUT", "Request cancelled"),
        );
      finish();
    };
    res.once("finish", finish);
    res.once("close", close);
    next();
  };
}
export function cors(
  origins: ReadonlySet<string>,
  credentials = true,
  methods = "GET,POST,PUT,PATCH,DELETE,OPTIONS",
): RequestHandler {
  return (req, res, next) => {
    res.vary("Origin");
    const origin = req.headers.origin;
    if (origin && origins.has(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      if (credentials)
        res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Methods", methods);
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type,Authorization",
      );
      res.setHeader(
        "Access-Control-Expose-Headers",
        "X-Request-Id,Retry-After",
      );
    }
    if (req.method === "OPTIONS") {
      const requested = req.headers["access-control-request-method"];
      if (
        (origin && !origins.has(origin)) ||
        (requested &&
          !methods.split(",").includes(String(requested).toUpperCase()))
      )
        return next(
          new ApiError(403, "FORBIDDEN", "Origin or method not allowed"),
        );
      res.status(204).end();
      return;
    }
    next();
  };
}
export const jsonBody = express.json({ limit: "32kb", strict: true });
export const ensureDeadline: RequestHandler = (_req, res, next) => {
  const context: Context | undefined = res.locals.request_context;
  if (res.writableEnded) return;
  if (context?.signal.aborted) return next(context.signal.reason);
  next();
};
export const notFound: RequestHandler = (_req, _res, next) =>
  next(new ApiError(404, "NOT_FOUND", "Route not found"));
