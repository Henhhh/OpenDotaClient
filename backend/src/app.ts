import express from "express";
import type { OpenDotaClient } from "../../shared/api-contract.ts";
import type { AuthConfig } from "./modules/auth/service.ts";
import { createPart3Foundation } from "./part3-foundation.ts";
import { createRouter as heroes } from "./modules/heroes/index.ts";
import { createRouter as constants } from "./modules/constants/index.ts";
import { createRouter as search } from "./modules/search/index.ts";
import { ApiError, errorHandler } from "./core/http.ts";
import {
  requestContext,
  cors,
  jsonBody,
  ensureDeadline,
  notFound,
} from "./core/middleware.ts";
import { createHealthRouter } from "./core/health.ts";
import { createRouter as players } from "./modules/players/index.ts";
import { createRouter as matchesRouter } from "./modules/matches/index.ts";
import { createRouter as parseJobsRouter } from "./modules/parse-jobs/index.ts";
import { MatchesService } from "./modules/matches/service.ts";
import { ParseService } from "./modules/matches/parse-service.ts";

/** One integration host for Players/Matches, Heroes/Search, Pro and account modules. */
export function createApp(options: {
  client: OpenDotaClient;
  databasePath: string;
  allowedWebOrigins: readonly string[];
  auth?: AuthConfig;
  enableRankings?: boolean;
  enableMatchParse?: boolean;
}) {
  const foundation = createPart3Foundation(options),
    app = express();
  app.disable("x-powered-by");
  const origins = new Set(options.allowedWebOrigins);
  app.use(requestContext(), cors(origins));
  app.use((req, res, next) => {
    if (
      req.method === "POST" &&
      req.path.replace(/\/$/, "") === "/api/v1/me/notifications/read-all"
    )
      res.locals.notification_boundary = foundation.me.notificationBoundary();
    next();
  });
  app.use(jsonBody, ensureDeadline);
  app.use("/api/v1", createHealthRouter());
  const matches = new MatchesService(options.client);
  const parse = new ParseService(
    options.client,
    foundation.parseJobs,
    matches,
    (job, userId) => {
      foundation.me.notify(userId, `parse:${job.job_id}:completed`, {
        kind: "match",
        title: "Match analysis ready",
        body: `Match ${job.match_id} has been parsed.`,
        target: { kind: "match", entity_id: job.match_id },
      });
    },
  );
  const parseDeps = {
    matches,
    parse,
    requireSession: foundation.requireSession,
    enableParse: options.enableMatchParse === true && !!foundation.authRouter,
  };
  app.use("/api/v1/players", players(options));
  app.use("/api/v1/matches", matchesRouter(parseDeps));
  app.use("/api/v1/parse-jobs", parseJobsRouter(parseDeps));
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
  app.use(notFound);
  app.use(errorHandler);
  return { app, foundation, close: foundation.close };
}
