import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type {
  SessionPrincipal,
  AppUser,
} from "../../../shared/api-contract.ts";
import { transaction } from "./index.ts";
export interface StoredSession {
  principal: SessionPrincipal;
  platform: "web" | "native";
  expires_at: string;
}
export interface SessionStore {
  resolve(token: string): StoredSession | null;
  revoke(token: string): void;
}
const hash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
const validToken = (token: string) => /^[A-Za-z0-9_-]{43}$/.test(token);
export function createSessionStore(db: DatabaseSync, now = Date.now) {
  function createForUser(user_id: string, platform: "web" | "native") {
    if (!["web", "native"].includes(platform))
      throw new Error("Invalid platform");
    return transaction(db, () => {
      const user = db
        .prepare("SELECT dota_account_id FROM users WHERE user_id=?")
        .get(user_id);
      if (!user) throw new Error("User not found");
      const token = randomBytes(32).toString("base64url"),
        expires = now() + 7 * 86400000;
      db.prepare("INSERT INTO sessions VALUES (?,?,?,?,?)").run(
        hash(token),
        user_id,
        platform,
        expires,
        new Date(now()).toISOString(),
      );
      return {
        token,
        principal: {
          user_id,
          account_id:
            user.dota_account_id === null ? null : String(user.dota_account_id),
        },
        platform,
        expires_at: new Date(expires).toISOString(),
      };
    });
  }
  return {
    createForUser,
    /** Internal compatibility helper for existing integration fixtures; no HTTP route calls this. */
    createForVerifiedAccount(account_id: string, platform: "web" | "native") {
      if (
        !/^[1-9][0-9]{0,9}$/.test(account_id) ||
        BigInt(account_id) > 4294967295n
      )
        throw new Error("Invalid account ID");
      return transaction(db, () => {
        db.prepare(
          "INSERT INTO users(user_id,identity_key,created_at,dota_account_id) VALUES (?,?,?,?) ON CONFLICT(identity_key) DO NOTHING",
        ).run(
          randomUUID(),
          account_id,
          new Date(now()).toISOString(),
          account_id,
        );
        const user_id = String(
          db
            .prepare("SELECT user_id FROM users WHERE identity_key=?")
            .get(account_id)!.user_id,
        );
        db.prepare(
          "INSERT INTO settings(user_id) VALUES (?) ON CONFLICT DO NOTHING",
        ).run(user_id);
        return createForUser(user_id, platform);
      });
    },
    user(user_id: string): AppUser {
      const u = db
        .prepare(
          "SELECT user_id,email,display_name,dota_account_id FROM users WHERE user_id=?",
        )
        .get(user_id);
      if (!u) throw new Error("User not found");
      return {
        user_id: String(u.user_id),
        email: u.email === null ? null : String(u.email),
        name: u.display_name === null ? "Account" : String(u.display_name),
        dota_account_id:
          u.dota_account_id === null ? null : String(u.dota_account_id),
      };
    },
    resolve(token: string): StoredSession | null {
      if (!validToken(token)) return null;
      const r = db
        .prepare(
          "SELECT s.user_id,u.dota_account_id,s.platform,s.expires_at FROM sessions s JOIN users u USING(user_id) WHERE token_hash=? AND expires_at>?",
        )
        .get(hash(token), now());
      return r
        ? {
            principal: {
              user_id: String(r.user_id),
              account_id:
                r.dota_account_id === null ? null : String(r.dota_account_id),
            },
            platform: r.platform as "web" | "native",
            expires_at: new Date(Number(r.expires_at)).toISOString(),
          }
        : null;
    },
    revoke(token: string) {
      if (validToken(token))
        db.prepare("DELETE FROM sessions WHERE token_hash=?").run(hash(token));
    },
    pruneExpired() {
      return Number(
        db.prepare("DELETE FROM sessions WHERE expires_at<=?").run(now())
          .changes,
      );
    },
  } satisfies SessionStore & Record<string, unknown>;
}
