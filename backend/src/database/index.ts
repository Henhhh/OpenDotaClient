import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createHash, randomUUID } from "node:crypto";

/** Synchronous callback only: never hold a SQLite transaction across await/network I/O. */
export function transaction<T>(db: DatabaseSync, action: () => T): T {
  const savepoint = db.isTransaction
    ? `nested_${randomUUID().replaceAll("-", "")}`
    : null;
  db.exec(savepoint ? `SAVEPOINT ${savepoint}` : "BEGIN IMMEDIATE");
  try {
    const result = action();
    db.exec(savepoint ? `RELEASE ${savepoint}` : "COMMIT");
    return result;
  } catch (error) {
    if (savepoint) db.exec(`ROLLBACK TO ${savepoint}; RELEASE ${savepoint}`);
    else db.exec("ROLLBACK");
    throw error;
  }
}

export function migrate(db: DatabaseSync): void {
  const migrations = [
    "001-foundation.sql",
    "002-auth.sql",
    "003-password-auth.sql",
  ].map((file, index) => {
    const sql = readFileSync(
      new URL(`./migrations/${file}`, import.meta.url),
      "utf8",
    );
    return {
      version: index + 1,
      sql,
      checksum: createHash("sha256")
        .update(sql.replaceAll("\r\n", "\n"))
        .digest("hex"),
    };
  });
  transaction(db, () => {
    db.exec(
      "CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, checksum TEXT NOT NULL, applied_at TEXT NOT NULL) STRICT",
    );
    const newer = db
      .prepare("SELECT version FROM schema_migrations WHERE version > ?")
      .get(migrations.length);
    if (newer)
      throw new Error("Database schema is newer than this application");
    for (const migration of migrations) {
      const current = db
        .prepare("SELECT checksum FROM schema_migrations WHERE version=?")
        .get(migration.version);
      if (current) {
        if (current.checksum !== migration.checksum)
          throw new Error(
            "Migration checksum changed; add a new migration instead",
          );
        continue;
      }
      db.exec(migration.sql);
      db.prepare("INSERT INTO schema_migrations VALUES (?,?,?)").run(
        migration.version,
        migration.checksum,
        new Date().toISOString(),
      );
    }
  });
}

export function openDatabase(filename: string): DatabaseSync {
  if (!filename.trim()) throw new Error("Database filename is required");
  if (filename !== ":memory:")
    mkdirSync(dirname(resolve(filename)), { recursive: true });
  const db = new DatabaseSync(filename);
  try {
    db.exec(
      "PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;",
    );
    migrate(db);
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}
