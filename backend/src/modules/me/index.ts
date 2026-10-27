import { Router } from "express";
import type { RequestHandler } from "express";
import { z } from "zod";
import { endpoint, query, pagination, numericId, page } from "../part2/http.ts";
import { sessionPrincipal } from "../auth/session.ts";
import type { createMeStore } from "./store.ts";
const empty = z.object({}).strict();
const kind = z.enum(["hero", "player", "team"]);
const opaque = z.string().min(1).max(128);
export function createRouter(deps: {
  store: ReturnType<typeof createMeStore>;
  requireSession: RequestHandler;
}) {
  const router = Router(),
    store = deps.store;
  router.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  router.use(deps.requireSession);
  const database = <T>(data: T) => ({
    data,
    source: "database" as const,
    fetched_at: new Date().toISOString(),
  });
  router.get(
    "/favorites",
    endpoint(async (req) => {
      const q = query(
        req,
        z.object({ ...pagination, kind: kind.optional() }).strict(),
      );
      return database(
        page(
          store.favorites(sessionPrincipal(req.res!).user_id, q.kind),
          q.limit,
          q.offset,
        ),
      );
    }),
  );
  router.put(
    "/favorites/:kind/:id",
    endpoint(async (req) => {
      query(req, empty);
      empty.parse(req.body);
      return database(
        store.putFavorite(
          sessionPrincipal(req.res!).user_id,
          kind.parse(req.params.kind),
          numericId.parse(req.params.id),
        ),
      );
    }),
  );
  router.delete("/favorites/:kind/:id", (req, res, next) => {
    try {
      query(req, empty);
      if (req.body !== undefined) empty.parse(req.body);
      store.deleteFavorite(
        sessionPrincipal(res).user_id,
        kind.parse(req.params.kind),
        numericId.parse(req.params.id),
      );
      res.status(204).end();
    } catch (e) {
      next(e);
    }
  });
  router.get(
    "/settings",
    endpoint(async (req) => {
      query(req, empty);
      return database(store.settings(sessionPrincipal(req.res!).user_id));
    }),
  );
  router.patch(
    "/settings",
    endpoint(async (req) => {
      query(req, empty);
      const patch = z
        .object({
          theme: z.enum(["dark", "light", "system"]).optional(),
          language: z.enum(["vi", "en"]).optional(),
          in_app_notifications: z.boolean().optional(),
        })
        .strict()
        .refine((v) => Object.keys(v).length > 0)
        .parse(req.body);
      return database(
        store.patchSettings(sessionPrincipal(req.res!).user_id, patch),
      );
    }),
  );
  router.get(
    "/notifications",
    endpoint(async (req) => {
      const q = query(
        req,
        z
          .object({
            ...pagination,
            unread: z.enum(["true", "false"]).optional(),
          })
          .strict(),
      );
      return database(
        page(
          store.notifications(
            sessionPrincipal(req.res!).user_id,
            q.unread === undefined ? undefined : q.unread === "true",
          ),
          q.limit,
          q.offset,
        ),
      );
    }),
  );
  router.post(
    "/notifications/read-all",
    endpoint(async (req) => {
      query(req, empty);
      empty.parse(req.body);
      return database(
        store.readAll(
          sessionPrincipal(req.res!).user_id,
          req.res!.locals.notification_boundary,
        ),
      );
    }),
  );
  router.patch(
    "/notifications/:id",
    endpoint(async (req) => {
      query(req, empty);
      z.object({ read: z.literal(true) })
        .strict()
        .parse(req.body);
      return database(
        store.read(
          sessionPrincipal(req.res!).user_id,
          opaque.parse(req.params.id),
        ),
      );
    }),
  );
  return router;
}
