import { Router } from "express";
import type { Request, RequestHandler } from "express";
import { z } from "zod";
import type { createAuthService } from "./service.ts";
import { summary } from "./service.ts";
import type { createSessionStore } from "../../database/session-store.ts";
import {
  sessionCookieOptions,
  SESSION_COOKIE,
  sessionPrincipal,
} from "./session.ts";
import { ApiError, endpoint, query } from "../part2/http.ts";
const empty = z.object({}).strict();
const FLOW_COOKIE = "opendota_login_flow";
function flowCookie(req: Request) {
  const values = (req.headers.cookie ?? "")
    .split(";")
    .map((v) => v.trim())
    .filter((v) => v.startsWith(`${FLOW_COOKIE}=`));
  return values.length === 1
    ? values[0].slice(FLOW_COOKIE.length + 1)
    : undefined;
}
export function createRouter(deps: {
  service: ReturnType<typeof createAuthService>;
  sessions: ReturnType<typeof createSessionStore>;
  requireSession: RequestHandler;
  production: boolean;
  webOrigins: readonly string[];
}) {
  const router = Router();
  router.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Referrer-Policy", "no-referrer");
    next();
  });
  router.post(
    "/steam/start",
    endpoint(async (req) => {
      query(req, empty);
      if (!req.is("application/json"))
        throw new ApiError(400, "VALIDATION_ERROR", "JSON required");
      const body = z
        .object({
          redirect_uri: z.string().max(2048),
          platform: z.enum(["web", "native"]),
        })
        .strict()
        .parse(req.body);
      if (
        body.platform === "web" &&
        (!req.headers.origin || !deps.webOrigins.includes(req.headers.origin))
      )
        throw new ApiError(403, "FORBIDDEN", "Origin not allowed");
      const start = deps.service.start(body.redirect_uri, body.platform);
      if (start.browser_token)
        req.res!.cookie(FLOW_COOKIE, start.browser_token, {
          ...sessionCookieOptions(deps.production),
          maxAge: 600000,
        });
      return {
        data: start.data,
        source: "database",
        fetched_at: new Date().toISOString(),
      };
    }),
  );
  router.get("/steam/callback", async (req, res, next) => {
    try {
      const q = query(
        req,
        z
          .record(z.string(), z.string())
          .refine((v) =>
            Object.keys(v).every(
              (k) => k === "state" || k.startsWith("openid."),
            ),
          ),
      );
      const redirect = await deps.service.callback(q.state ?? "", q);
      res.redirect(302, redirect);
    } catch (e) {
      next(e);
    }
  });
  router.post(
    "/exchange",
    endpoint(async (req) => {
      query(req, empty);
      if (!req.is("application/json"))
        throw new ApiError(400, "VALIDATION_ERROR", "JSON required");
      const body = z
        .object({ code: z.string().max(128), state: z.string().max(128) })
        .strict()
        .parse(req.body);
      const result = deps.service.exchange(
        body.code,
        body.state,
        flowCookie(req),
        req.headers.origin,
      );
      if (result.platform === "web") {
        req.res!.cookie(
          SESSION_COOKIE,
          result.token,
          sessionCookieOptions(deps.production),
        );
        req.res!.clearCookie(
          FLOW_COOKIE,
          sessionCookieOptions(deps.production),
        );
      }
      return {
        data:
          result.platform === "web"
            ? result.session
            : { session: result.session, access_token: result.token },
        source: "database",
        fetched_at: new Date().toISOString(),
      };
    }),
  );
  router.get(
    "/session",
    deps.requireSession,
    endpoint(async (req) => {
      query(req, empty);
      const res = req.res!;
      return {
        data: {
          user: summary(sessionPrincipal(res).account_id),
          expires_at: String(res.locals.session_expires_at),
        },
        source: "database",
        fetched_at: new Date().toISOString(),
      };
    }),
  );
  router.post("/logout", deps.requireSession, (req, res, next) => {
    try {
      query(req, empty);
      empty.parse(req.body);
      deps.sessions.revoke(res.locals.session_token);
      res.clearCookie(SESSION_COOKIE, sessionCookieOptions(deps.production));
      res.status(204).end();
    } catch (e) {
      next(e);
    }
  });
  return router;
}
