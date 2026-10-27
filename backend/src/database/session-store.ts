import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import type { SessionPrincipal } from '../../../shared/api-contract.ts';
import { transaction } from './index.ts';

export interface StoredSession {
  principal: SessionPrincipal;
  platform: 'web' | 'native';
  expires_at: string;
}
export interface SessionStore {
  resolve(token: string): StoredSession | null;
  revoke(token: string): void;
}
const hash = (token: string) => createHash('sha256').update(token).digest('hex');
const validToken = (token: string) => /^[A-Za-z0-9_-]{43}$/.test(token);

export function createSessionStore(db: DatabaseSync, now = Date.now) {
  return {
    /** Internal only: call after Steam identity verification, never with an HTTP body account_id. */
    createForVerifiedAccount(account_id: string, platform: 'web' | 'native') {
      if (!/^[1-9][0-9]{0,9}$/.test(account_id) || BigInt(account_id) > 4294967295n) throw new Error('Invalid account ID');
      if (!['web', 'native'].includes(platform)) throw new Error('Invalid platform');
      return transaction(db, () => {
        const created_at = new Date(now()).toISOString();
        db.prepare('INSERT INTO users VALUES (?,?,?) ON CONFLICT(account_id) DO NOTHING').run(randomUUID(), account_id, created_at);
        const user = db.prepare('SELECT user_id FROM users WHERE account_id=?').get(account_id)!;
        const user_id = String(user.user_id);
        db.prepare('INSERT INTO settings(user_id) VALUES (?) ON CONFLICT DO NOTHING').run(user_id);
        const token = randomBytes(32).toString('base64url');
        const expires = now() + 7 * 86400000;
        db.prepare('INSERT INTO sessions VALUES (?,?,?,?,?)').run(hash(token), user_id, platform, expires, created_at);
        return { token, principal: { user_id, account_id }, platform, expires_at: new Date(expires).toISOString() };
      });
    },
    resolve(token: string): StoredSession | null {
      if (!validToken(token)) return null;
      const row = db.prepare('SELECT s.user_id,u.account_id,s.platform,s.expires_at FROM sessions s JOIN users u USING(user_id) WHERE token_hash=? AND expires_at>?').get(hash(token), now());
      if (!row) return null;
      return { principal: { user_id: String(row.user_id), account_id: String(row.account_id) }, platform: row.platform as 'web' | 'native', expires_at: new Date(Number(row.expires_at)).toISOString() };
    },
    revoke(token: string) { if (validToken(token)) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(token)); },
    pruneExpired() { return Number(db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(now()).changes); },
  } satisfies SessionStore & Record<string, unknown>;
}
