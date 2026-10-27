import { randomUUID, createHash } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { Session } from "../../../../shared/api-contract.ts";
import { ApiError } from "../../core/http.ts";
import { transaction } from "../../database/index.ts";
import { createMeStore } from "../me/store.ts";
import type { createSessionStore } from "../../database/session-store.ts";
import { hashPassword, verifyPassword } from "./password.ts";
export interface AuthConfig {
  production: boolean;
  webOrigins: readonly string[];
}
export function createAuthService(
  db: DatabaseSync,
  sessions: ReturnType<typeof createSessionStore>,
  _config: AuthConfig,
  now = Date.now,
) {
  const attempts = new Map<string, { n: number; until: number }>();
  function throttle(ip: string, email: string) {
    for (const [k, v] of attempts) if (v.until <= now()) attempts.delete(k);
    const keys = [
      "ip:" + ip,
      "email:" + createHash("sha256").update(email).digest("hex"),
    ];
    if (attempts.size > 10000)
      throw new ApiError(
        429,
        "RATE_LIMITED",
        "Authentication is busy. Retry later.",
        900,
      );
    for (const key of keys) {
      const a = attempts.get(key) ?? { n: 0, until: now() + 15 * 60000 };
      if (a.n >= 15)
        throw new ApiError(
          429,
          "RATE_LIMITED",
          "Too many sign-in attempts. Retry in 15 minutes.",
          Math.max(1, Math.ceil((a.until - now()) / 1000)),
        );
      a.n++;
      attempts.set(key, a);
    }
  }
  function issue(userId: string, platform: "web" | "native") {
    const created = sessions.createForUser(userId, platform);
    const session: Session = {
      user: sessions.user(userId),
      expires_at: created.expires_at,
    };
    createMeStore(db).notify(
      userId,
      "login:" + createHash("sha256").update(created.token).digest("hex"),
      {
        kind: "system",
        title: "Sign-in successful",
        body: "A new session was created for your account.",
        target: null,
      },
    );
    return { session, token: created.token, platform };
  }
  const conflict = () =>
    new ApiError(409, "CONFLICT", "Email is already registered.");
  return {
    async register(
      email: string,
      password: string,
      name: string,
      platform: "web" | "native",
      ip: string,
    ) {
      throttle(ip, email);
      if (db.prepare("SELECT user_id FROM users WHERE email=?").get(email))
        throw conflict();
      const hashed = await hashPassword(password);
      return transaction(db, () => {
        if (db.prepare("SELECT user_id FROM users WHERE email=?").get(email))
          throw conflict();
        const id = randomUUID();
        db.prepare(
          "INSERT INTO users(user_id,identity_key,created_at,email,password_hash,display_name) VALUES (?,?,?,?,?,?)",
        ).run(
          id,
          "app:" + id,
          new Date(now()).toISOString(),
          email,
          hashed,
          name,
        );
        db.prepare("INSERT INTO settings(user_id) VALUES (?)").run(id);
        return issue(id, platform);
      });
    },
    async login(
      email: string,
      password: string,
      platform: "web" | "native",
      ip: string,
    ) {
      throttle(ip, email);
      const u = db
        .prepare("SELECT user_id,password_hash FROM users WHERE email=?")
        .get(email);
      if (
        !(await verifyPassword(
          password,
          u?.password_hash ? String(u.password_hash) : null,
        ))
      )
        throw new ApiError(
          401,
          "UNAUTHORIZED",
          "Email or password is incorrect.",
        );
      return transaction(db, () => issue(String(u!.user_id), platform));
    },
    async credentials(
      userId: string,
      email: string,
      password: string,
      name: string,
      ip: string,
    ) {
      throttle(ip, email);
      const u = db
        .prepare("SELECT email FROM users WHERE user_id=?")
        .get(userId);
      if (!u || u.email !== null)
        throw new ApiError(
          409,
          "CONFLICT",
          "This account already has login credentials.",
        );
      if (db.prepare("SELECT user_id FROM users WHERE email=?").get(email))
        throw conflict();
      const hashed = await hashPassword(password);
      return transaction(db, () => {
        if (db.prepare("SELECT user_id FROM users WHERE email=?").get(email))
          throw conflict();
        const changed = db
          .prepare(
            "UPDATE users SET email=?,password_hash=?,display_name=? WHERE user_id=? AND email IS NULL",
          )
          .run(email, hashed, name, userId);
        if (!changed.changes)
          throw new ApiError(409, "CONFLICT", "Credentials were already set.");
        return sessions.user(userId);
      });
    },
    setDotaAccount(userId: string, id: string | null) {
      db.prepare("UPDATE users SET dota_account_id=? WHERE user_id=?").run(
        id,
        userId,
      );
      return sessions.user(userId);
    },
  };
}
