import { Router } from "express";
import type { RequestHandler } from "express";
import { ApiError, endpoint, query, empty, opaqueId } from "../../core/http.ts";
import { sessionPrincipal } from "../auth/session.ts";
import type { ParseService } from "../matches/parse-service.ts";
export function createRouter(deps: {
  parse: ParseService;
  requireSession: RequestHandler;
  enableParse: boolean;
}) {
  const router = Router();
  router.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  router.use((_req, _res, next) =>
    next(
      deps.enableParse
        ? undefined
        : new ApiError(
            501,
            "FEATURE_UNAVAILABLE",
            "Match parsing is not enabled",
          ),
    ),
  );
  router.use(deps.requireSession);
  router.get(
    "/:id",
    endpoint(async (req, c) => {
      query(req, empty);
      return {
        data: await deps.parse.get(
          opaqueId.parse(req.params.id),
          sessionPrincipal(req.res!).user_id,
          c,
        ),
        source: "database",
        fetched_at: new Date().toISOString(),
      };
    }),
  );
  return router;
}
