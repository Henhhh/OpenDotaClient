import { Router } from "express";
import type { RequestHandler, Request } from "express";
import { z } from "zod";
import type { createAuthService } from "./service.ts";
import type { createSessionStore } from "../../database/session-store.ts";
import {
  sessionCookieOptions,
  SESSION_COOKIE,
  sessionPrincipal,
} from "./session.ts";
import { ApiError, endpoint, query, accountId } from "../../core/http.ts";
const empty = z.object({}).strict();
const email = z
  .string()
  .trim()
  .max(254)
  .email()
  .transform((s) => s.toLowerCase());
const password = z
  .string()
  .min(6)
  .max(128)
  .refine((p) => Buffer.byteLength(p, "utf8") <= 512);
const name = z.string().trim().min(2).max(80);
const credentials = z.object({ email, password, name }).strict();
const login = z
  .object({ email, password, platform: z.enum(["web", "native"]) })
  .strict();
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
    next();
  });
  function sessionData(req: Request) {
    const res = req.res!;
    return {
      user: deps.sessions.user(sessionPrincipal(res).user_id),
      expires_at: String(res.locals.session_expires_at),
    };
  }
  function validateTransport(req: Request, platform: "web" | "native") {
    if (platform === "web") {
      if (!req.headers.origin || !deps.webOrigins.includes(req.headers.origin))
        throw new ApiError(403, "FORBIDDEN", "Origin not allowed");
      if (req.headers.authorization)
        throw new ApiError(
          400,
          "VALIDATION_ERROR",
          "Web sign-in requires cookie transport",
        );
    } else if (req.headers.origin || req.headers.cookie)
      throw new ApiError(403, "FORBIDDEN", "Use web sign-in from a browser");
  }
  for (const action of ["register", "login"] as const)
    router.post(
      "/" + action,
      endpoint(async (req) => {
        query(req, empty);
        if (!req.is("application/json"))
          throw new ApiError(400, "VALIDATION_ERROR", "JSON required");
        const b = (
          action === "register" ? login.extend({ name }).strict() : login
        ).parse(req.body);
        validateTransport(req, b.platform);
        const result =
          action === "register"
            ? await deps.service.register(
                b.email,
                b.password,
                ("name" in b ? b.name : "") as string,
                b.platform,
                req.ip ?? "unknown",
              )
            : await deps.service.login(
                b.email,
                b.password,
                b.platform,
                req.ip ?? "unknown",
              );
        if (b.platform === "web")
          req.res!.cookie(
            SESSION_COOKIE,
            result.token,
            sessionCookieOptions(deps.production),
          );
        // Revoke any previous session on this device after successful replacement.
        const cookie = (req.headers.cookie ?? "")
          .split(";")
          .map((v) => v.trim())
          .find((v) => v.startsWith(SESSION_COOKIE + "="));
        const previous =
          cookie?.slice(SESSION_COOKIE.length + 1) ??
          req.headers.authorization?.replace(/^Bearer /i, "");
        if (previous) deps.sessions.revoke(previous);
        return {
          data:
            b.platform === "web"
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
      return {
        data: sessionData(req),
        source: "database",
        fetched_at: new Date().toISOString(),
      };
    }),
  );
  router.post(
    "/credentials",
    deps.requireSession,
    endpoint(async (req) => {
      query(req, empty);
      const b = credentials.parse(req.body);
      await deps.service.credentials(
        sessionPrincipal(req.res!).user_id,
        b.email,
        b.password,
        b.name,
        req.ip ?? "unknown",
      );
      return {
        data: sessionData(req),
        source: "database",
        fetched_at: new Date().toISOString(),
      };
    }),
  );
  router.patch(
    "/profile",
    deps.requireSession,
    endpoint(async (req) => {
      query(req, empty);
      const b = z
        .object({ dota_account_id: accountId.nullable() })
        .strict()
        .parse(req.body);
      deps.service.setDotaAccount(
        sessionPrincipal(req.res!).user_id,
        b.dota_account_id,
      );
      return {
        data: sessionData(req),
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
