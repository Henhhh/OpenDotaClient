import { Router } from "express";
import type { RequestHandler } from "express";
import {
  ApiError,
  endpoint,
  query,
  body,
  empty,
  numericId,
} from "../../core/http.ts";
import { sessionPrincipal } from "../auth/session.ts";
import type { MatchesService } from "./service.ts";
import type { ParseService } from "./parse-service.ts";
export function createRouter(deps: {
  matches: MatchesService;
  parse: ParseService;
  requireSession: RequestHandler;
  enableParse: boolean;
}) {
  const router = Router();
  const gate: RequestHandler = (_req, _res, next) =>
    next(
      deps.enableParse
        ? undefined
        : new ApiError(
            501,
            "FEATURE_UNAVAILABLE",
            "Match parsing is not enabled",
          ),
    );
  router.get(
    "/:id",
    endpoint(async (req, c) => {
      query(req, empty);
      return deps.matches.detail(numericId.parse(req.params.id), c);
    }),
  );
  router.post(
    "/:id/parse",
    (_req, res, next) => {
      res.setHeader("Cache-Control", "no-store");
      next();
    },
    gate,
    deps.requireSession,
    endpoint(async (req, c) => {
      query(req, empty);
      body(req, empty);
      const job = await deps.parse.request(
        numericId.parse(req.params.id),
        sessionPrincipal(req.res!).user_id,
        c,
      );
      return {
        data: job,
        fetched_at: new Date().toISOString(),
        source: "database",
      };
    }, 202),
  );
  return router;
}
