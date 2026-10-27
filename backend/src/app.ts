import express from "express";
import { randomUUID } from "node:crypto";
import type { ErrorRequestHandler } from "express";
import type { OpenDotaClient } from "../../shared/api-contract.ts";
import type { AuthConfig } from "./modules/auth/service.ts";
import type { createSteamVerifier } from "./modules/auth/steam.ts";
import { createPart3Foundation } from "./part3-foundation.ts";
import { createRouter as heroes } from "./modules/heroes/index.ts";
import { createRouter as constants } from "./modules/constants/index.ts";
import { createRouter as search } from "./modules/search/index.ts";
import {
  ApiError,
  errorHandler,
  endpoint,
  query,
} from "./modules/part2/http.ts";
import { z } from "zod";

/** Integration host for existing modules. Person 1 can mount Players/Matches here later. */
export function createApp(options: {
  client: OpenDotaClient;
  databasePath: string;
  allowedWebOrigins: readonly string[];
  auth?: AuthConfig;
  verifySteam?: ReturnType<typeof createSteamVerifier>;
  enableRankings?: boolean;
}) {
  const foundation = createPart3Foundation(options),
    app = express();
  app.disable("x-powered-by");
  const origins = new Set(options.allowedWebOrigins);
  app.use((req, res, next) => {
    res.locals.request_id = randomUUID();
    res.locals.deadline_ms = Date.now() + 20000;
    if (
      req.method === "POST" &&
      req.path.replace(/\/$/, "") === "/api/v1/me/notifications/read-all"
    )
      res.locals.notification_boundary = foundation.me.notificationBoundary();
    res.setHeader("X-Request-Id", res.locals.request_id);
    const origin = req.headers.origin;
    if (origin && origins.has(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.vary("Origin");
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      );
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
      res.status(origin && !origins.has(origin) ? 403 : 204).end();
      return;
    }
    next();
  });
  app.use(express.json({ limit: "32kb", strict: true }));
  app.get(
    "/api/v1/health",
    endpoint(async (req) => {
      query(req, z.object({}).strict());
      return {
        data: { status: "ok" as const, version: "v1" as const },
        source: "aggregate",
        fetched_at: new Date().toISOString(),
      };
    }),
  );
  app.use("/api/v1/heroes", heroes(options));
  app.use("/api/v1/constants", constants(options));
  app.use("/api/v1/search", search({ ...options, teams: foundation.teams }));
  app.use("/api/v1/pro", foundation.proRouter);
  if (foundation.authRouter) {
    app.use("/api/v1/auth", foundation.authRouter);
    app.use("/api/v1/me", foundation.meRouter);
  } else
    app.use(["/api/v1/auth", "/api/v1/me"], (_req, _res, next) =>
      next(
        new ApiError(
          501,
          "FEATURE_UNAVAILABLE",
          "Account features not configured",
        ),
      ),
    );
  app.use((_req, _res, next) =>
    next(new ApiError(404, "NOT_FOUND", "Route not found")),
  );
  const parserErrors: ErrorRequestHandler = (err, _req, _res, next) => {
    if (err?.type === "entity.parse.failed" || err?.type === "entity.too.large")
      next(new ApiError(400, "VALIDATION_ERROR", "Invalid JSON body"));
    else next(err);
  };
  app.use(parserErrors);
  app.use(errorHandler);
  return { app, foundation, close: foundation.close };
}
