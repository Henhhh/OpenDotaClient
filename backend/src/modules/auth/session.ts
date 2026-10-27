import type { RequestHandler, Response } from "express";
import type { SessionPrincipal } from "../../../../shared/api-contract.ts";
import type { SessionStore } from "../../database/session-store.ts";
import { ApiError } from "../../core/http.ts";

export const SESSION_COOKIE = "opendota_session";
export function sessionCookieOptions(production: boolean) {
  return {
    httpOnly: true,
    secure: production,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 7 * 86400000,
  };
}
export function requireSession(
  store: SessionStore,
  allowedOrigins: ReadonlySet<string>,
): RequestHandler {
  return (req, res, next) => {
    try {
      const cookies = (req.headers.cookie ?? "")
        .split(";")
        .map((p) => p.trim())
        .filter((p) => p.startsWith(`${SESSION_COOKIE}=`));
      const auth = req.headers.authorization;
      if (cookies.length > 1 || (auth && cookies.length))
        throw new ApiError(401, "UNAUTHORIZED", "Ambiguous credentials");
      let token: string | undefined;
      if (auth) {
        const match = /^Bearer ([A-Za-z0-9_-]{43})$/i.exec(auth);
        if (!match) throw new ApiError(401, "UNAUTHORIZED", "Invalid session");
        token = match[1];
      } else if (cookies.length)
        token = cookies[0].slice(SESSION_COOKIE.length + 1);
      const session = token ? store.resolve(token) : null;
      if (
        !session ||
        (auth ? session.platform !== "native" : session.platform !== "web")
      )
        throw new ApiError(401, "UNAUTHORIZED", "Session required");
      if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
        if (!req.is("application/json"))
          throw new ApiError(400, "VALIDATION_ERROR", "JSON body required");
        if (
          !auth &&
          (!req.headers.origin || !allowedOrigins.has(req.headers.origin))
        )
          throw new ApiError(403, "FORBIDDEN", "Origin not allowed");
      }
      res.locals.principal = session.principal;
      res.locals.session_expires_at = session.expires_at;
      res.locals.session_token = token;
      next();
    } catch (error) {
      next(error);
    }
  };
}
export function sessionPrincipal(res: Response): SessionPrincipal {
  if (!res.locals.principal)
    throw new ApiError(401, "UNAUTHORIZED", "Session required");
  return res.locals.principal;
}
