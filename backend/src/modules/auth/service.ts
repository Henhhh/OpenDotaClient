import { createHash, randomBytes } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type {
  LoginStart,
  Session,
  PlayerSummary,
} from "../../../../shared/api-contract.ts";
import { ApiError } from "../part2/http.ts";
import { transaction } from "../../database/index.ts";
import { createMeStore } from "../me/store.ts";
import type { createSessionStore } from "../../database/session-store.ts";
import { authorizationUrl, createSteamVerifier, opaqueToken } from "./steam.ts";
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const random = () => randomBytes(32).toString("base64url");
const denied = () =>
  new ApiError(401, "UNAUTHORIZED", "Login expired or invalid");
export const summary = (account_id: string): PlayerSummary => ({
  account_id,
  name: null,
  avatar_url: null,
  country: null,
  rank_tier: null,
  leaderboard_rank: null,
});
export interface AuthConfig {
  publicBaseUrl: string;
  webOrigins: readonly string[];
  webRedirects: readonly string[];
  nativeRedirects: readonly string[];
  production: boolean;
}
export function createAuthService(
  db: DatabaseSync,
  sessions: ReturnType<typeof createSessionStore>,
  config: AuthConfig,
  verify = createSteamVerifier(),
  now = Date.now,
) {
  const base = new URL(config.publicBaseUrl);
  if (
    !["http:", "https:"].includes(base.protocol) ||
    base.username ||
    base.password ||
    base.pathname !== "/" ||
    base.search ||
    base.hash ||
    (config.production && base.protocol !== "https:")
  )
    throw new Error("Invalid PUBLIC_BASE_URL");
  for (const redirect of [...config.webRedirects, ...config.nativeRedirects]) {
    const url = new URL(redirect);
    if (url.username || url.password || url.hash || url.search)
      throw new Error(
        "Redirect URIs must have no credentials, query or fragment",
      );
    if (
      config.webRedirects.includes(redirect) &&
      (!config.webOrigins.includes(url.origin) ||
        !["http:", "https:"].includes(url.protocol) ||
        (config.production && url.protocol !== "https:"))
    )
      throw new Error("Invalid web redirect");
    if (
      config.nativeRedirects.includes(redirect) &&
      ["http:", "https:", "javascript:", "data:", "file:"].includes(
        url.protocol,
      )
    )
      throw new Error("Invalid native redirect");
  }
  return {
    start(
      redirect_uri: string,
      platform: "web" | "native",
    ): { data: LoginStart; browser_token: string | null } {
      const allowed =
        platform === "web" ? config.webRedirects : config.nativeRedirects;
      if (!allowed.includes(redirect_uri))
        throw new ApiError(400, "VALIDATION_ERROR", "Redirect not allowed");
      const state = random(),
        browser = platform === "web" ? random() : null,
        expires = now() + 600000;
      const returnTo = new URL("/api/v1/auth/steam/callback", base);
      returnTo.searchParams.set("state", state);
      db.prepare(
        "INSERT INTO auth_flows(state_hash,redirect_uri,platform,browser_hash,expires_at,return_to) VALUES (?,?,?,?,?,?)",
      ).run(
        hash(state),
        redirect_uri,
        platform,
        browser ? hash(browser) : null,
        expires,
        returnTo.href,
      );
      return {
        data: {
          authorization_url: authorizationUrl(returnTo.href, base.origin + "/"),
          state,
          expires_at: new Date(expires).toISOString(),
        },
        browser_token: browser,
      };
    },
    async callback(state: string, params: Record<string, string>) {
      if (!opaqueToken.test(state)) throw denied();
      const flow = db
        .prepare(
          "SELECT * FROM auth_flows WHERE state_hash=? AND expires_at>? AND code_hash IS NULL",
        )
        .get(hash(state), now());
      if (!flow) throw denied();
      const assertion = await verify(params, String(flow.return_to));
      return transaction(db, () => {
        const code = random();
        db.prepare("DELETE FROM openid_nonces WHERE expires_at<=?").run(now());
        if (
          db
            .prepare("SELECT nonce FROM openid_nonces WHERE nonce=?")
            .get(assertion.nonce)
        )
          throw denied();
        const changed = db
          .prepare(
            "UPDATE auth_flows SET code_hash=?,code_expires_at=?,account_id=? WHERE state_hash=? AND expires_at>? AND code_hash IS NULL",
          )
          .run(
            hash(code),
            now() + 60000,
            assertion.account_id,
            hash(state),
            now(),
          );
        if (!changed.changes) throw denied();
        db.prepare("INSERT INTO openid_nonces VALUES (?,?)").run(
          assertion.nonce,
          now() + 600000,
        );
        const redirect = new URL(String(flow.redirect_uri));
        redirect.searchParams.set("code", code);
        redirect.searchParams.set("state", state);
        return redirect.href;
      });
    },
    exchange(
      code: string,
      state: string,
      browserToken: string | undefined,
      origin: string | undefined,
    ) {
      if (!opaqueToken.test(code) || !opaqueToken.test(state)) throw denied();
      return transaction(db, () => {
        const row = db
          .prepare(
            "SELECT * FROM auth_flows WHERE state_hash=? AND code_hash=? AND code_expires_at>? AND expires_at>?",
          )
          .get(hash(state), hash(code), now(), now());
        if (!row || !row.account_id) throw denied();
        if (
          row.platform === "web" &&
          (!browserToken ||
            !opaqueToken.test(browserToken) ||
            hash(browserToken) !== row.browser_hash ||
            !origin ||
            !config.webOrigins.includes(origin))
        )
          throw denied();
        db.prepare("DELETE FROM auth_flows WHERE state_hash=?").run(
          hash(state),
        );
        const created = sessions.createForVerifiedAccount(
          String(row.account_id),
          row.platform as "web" | "native",
        );
        const session: Session = {
          user: summary(created.principal.account_id),
          expires_at: created.expires_at,
        };
        createMeStore(db).notify(
          created.principal.user_id,
          `login:${hash(created.token)}`,
          {
            kind: "system",
            title: "Steam sign-in successful",
            body: "A new session was created for your account.",
            target: null,
          },
        );
        return { session, token: created.token, platform: created.platform };
      });
    },
    pruneExpired() {
      return db
        .prepare(
          "DELETE FROM auth_flows WHERE expires_at<=? OR code_expires_at<=?",
        )
        .run(now(), now()).changes;
    },
  };
}
