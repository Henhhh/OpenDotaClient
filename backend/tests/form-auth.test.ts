import { test } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { DatabaseSync } from "node:sqlite";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { createApp } from "../src/app.ts";
import { migrate, openDatabase } from "../src/database/index.ts";
import { createSessionStore } from "../src/database/session-store.ts";
import { createAuthService } from "../src/modules/auth/service.ts";
import type { OpenDotaClient } from "../../shared/api-contract.ts";
const config = { production: false, webOrigins: ["http://localhost:8081"] };
const upstream: OpenDotaClient = {
  async get() {
    throw new Error("Auth must not call OpenDota");
  },
  async post() {
    throw new Error("Auth must not call upstream");
  },
};
async function host(
  run: (
    b: ReturnType<typeof createApp>,
    call: (
      path: string,
      body?: unknown,
      headers?: Record<string, string>,
      method?: string,
    ) => Promise<{ status: number; body: any; headers: Headers }>,
  ) => Promise<void>,
) {
  const b = createApp({
    client: upstream,
    databasePath: ":memory:",
    allowedWebOrigins: config.webOrigins,
    auth: config,
  });
  const s = b.app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => s.once("listening", r));
  const call = async (
    path: string,
    body?: unknown,
    headers: Record<string, string> = {},
    method = body === undefined ? "GET" : "POST",
  ) => {
    const r = await fetch(
      `http://127.0.0.1:${(s.address() as AddressInfo).port}/api/v1${path}`,
      {
        method,
        headers: { "Content-Type": "application/json", ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
      },
    );
    return {
      status: r.status,
      body: r.status === 204 ? null : await r.json(),
      headers: r.headers,
    };
  };
  try {
    await run(b, call);
  } finally {
    await new Promise<void>((r, j) => s.close((e) => (e ? j(e) : r())));
    b.close();
  }
}
const signup = (email = "person@example.com", platform = "native") => ({
  email,
  password: "abc123",
  name: "Test Person",
  platform,
});
const bearer = (token: string) => ({ authorization: "Bearer " + token });
test("native registration and login use app identity, never a fabricated Dota identity; logout revokes token", async () =>
  host(async (_b, call) => {
    const r = await call("/auth/register", signup());
    assert.equal(r.status, 200);
    const token = r.body.data.access_token;
    assert.match(r.body.data.session.user.user_id, /^[a-f0-9-]{36}$/);
    assert.equal(r.body.data.session.user.dota_account_id, null);
    assert.equal(r.body.data.session.user.email, "person@example.com");
    assert.ok(!JSON.stringify(r.body).includes("password"));
    assert.equal(r.headers.get("cache-control"), "no-store");
    assert.equal(
      (await call("/auth/session", undefined, bearer(token))).status,
      200,
    );
    await call("/auth/logout", {}, bearer(token));
    assert.equal(
      (await call("/auth/session", undefined, bearer(token))).status,
      401,
    );
    const login = await call("/auth/login", {
      email: "PERSON@EXAMPLE.COM",
      password: signup().password,
      platform: "native",
    });
    assert.equal(login.status, 200);
    assert.equal(
      login.body.data.session.user.user_id,
      r.body.data.session.user.user_id,
    );
  }));
test("web credentials require allowed Origin; cookie is HttpOnly and web JSON never exposes token; mixed transport rejected", async () =>
  host(async (_b, call) => {
    assert.equal(
      (await call("/auth/register", signup("a@example.com", "web"))).status,
      403,
    );
    const r = await call("/auth/register", signup("a@example.com", "web"), {
      origin: config.webOrigins[0],
    });
    assert.equal(r.status, 200);
    assert.ok(!r.body.data.access_token);
    assert.match(r.headers.get("set-cookie")!, /HttpOnly/);
    const cookie = r.headers.get("set-cookie")!.split(";")[0];
    assert.equal(
      (await call("/auth/session", undefined, { cookie })).status,
      200,
    );
    assert.equal((await call("/auth/logout", {}, { cookie })).status, 403);
    assert.equal(
      (await call("/auth/logout", {}, { cookie, origin: config.webOrigins[0] }))
        .status,
      204,
    );
    assert.equal(
      (
        await call(
          "/auth/login",
          {
            email: "a@example.com",
            password: signup().password,
            platform: "native",
          },
          { origin: config.webOrigins[0] },
        )
      ).status,
      403,
    );
  }));
test("wrong password and missing email share error; validation, normalization and duplicate email are enforced", async () =>
  host(async (_b, call) => {
    const r = await call("/auth/register", signup());
    assert.equal(r.status, 200);
    const wrong = await call("/auth/login", {
      email: signup().email,
      password: "wrong password 123",
      platform: "native",
    });
    const missing = await call("/auth/login", {
      email: "missing@example.com",
      password: "wrong password 123",
      platform: "native",
    });
    assert.equal(wrong.status, 401);
    assert.deepEqual(wrong.body.error, missing.body.error);
    assert.equal(
      (await call("/auth/register", signup("PERSON@EXAMPLE.COM"))).status,
      409,
    );
    for (const body of [
      { ...signup("b@example.com"), password: "short" },
      { ...signup("b@example.com"), extra: true },
      { ...signup("b@example.com"), user_id: r.body.data.session.user.user_id },
    ])
      assert.equal((await call("/auth/register", body)).status, 400);
    assert.equal((await call("/auth/steam/start", {})).status, 404);
    assert.equal((await call("/auth/exchange", {})).status, 404);
  }));
test("Dota ID is an unverified viewing preference and cannot merge app accounts or favorites", async () =>
  host(async (_b, call) => {
    const a = (await call("/auth/register", signup("a@example.com"))).body.data,
      b = (await call("/auth/register", signup("b@example.com"))).body.data;
    for (const token of [a.access_token, b.access_token]) {
      const r = await call(
        "/auth/profile",
        { dota_account_id: "123" },
        bearer(token),
        "PATCH",
      );
      assert.equal(r.status, 200);
      assert.equal(r.body.data.user.dota_account_id, "123");
    }
    await call("/me/favorites/hero/1", {}, bearer(a.access_token), "PUT");
    const list = await call("/me/favorites", undefined, bearer(b.access_token));
    assert.equal(list.body.data.items.length, 0);
    assert.notEqual(a.session.user.user_id, b.session.user.user_id);
    assert.equal(
      (
        await call(
          "/auth/profile",
          { dota_account_id: "0" },
          bearer(a.access_token),
          "PATCH",
        )
      ).status,
      400,
    );
  }));
test("existing authenticated legacy account can set credentials and retain favorites; cannot steal an account via Dota ID", async () =>
  host(async (b, call) => {
    const legacy = b.foundation.sessions.createForVerifiedAccount(
      "123",
      "native",
    );
    await call("/me/favorites/hero/1", {}, bearer(legacy.token), "PUT");
    const upgraded = await call(
      "/auth/credentials",
      {
        email: "legacy@example.com",
        password: signup().password,
        name: "Legacy",
      },
      bearer(legacy.token),
    );
    assert.equal(upgraded.status, 200);
    assert.equal(upgraded.body.data.user.user_id, legacy.principal.user_id);
    assert.equal(
      (
        await call(
          "/auth/credentials",
          {
            email: "evil@example.com",
            password: signup().password,
            name: "Evil",
          },
          bearer(legacy.token),
        )
      ).status,
      409,
    );
    const login = await call("/auth/login", {
      email: "legacy@example.com",
      password: signup().password,
      platform: "native",
    });
    assert.equal(
      (
        await call(
          "/me/favorites",
          undefined,
          bearer(login.body.data.access_token),
        )
      ).body.data.items.length,
      1,
    );
    assert.equal(
      (
        await call("/auth/credentials", {
          email: "takeover@example.com",
          password: signup().password,
          name: "Takeover",
        })
      ).status,
      401,
    );
  }));
test("concurrent registration of one email creates one account; passwords are salted scrypt and not plaintext", async () => {
  const db = openDatabase(":memory:"),
    store = createSessionStore(db),
    auth = createAuthService(db, store, config);
  try {
    const results = await Promise.allSettled([
      auth.register("a@example.com", signup().password, "A", "native", "ip"),
      auth.register("a@example.com", signup().password, "A", "native", "ip"),
    ]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(db.prepare("SELECT count(*) n FROM users").get()!.n, 1);
    const hash = String(
      db.prepare("SELECT password_hash FROM users").get()!.password_hash,
    );
    assert.match(hash, /^scrypt\$32768\$/);
    assert.notEqual(hash, signup().password);
    await auth.register(
      "b@example.com",
      signup().password,
      "B",
      "native",
      "ip",
    );
    const hashes = db
      .prepare("SELECT password_hash FROM users")
      .all()
      .map((r) => r.password_hash);
    assert.notEqual(hashes[0], hashes[1]);
  } finally {
    db.close();
  }
});
test("registration rolls back account, session and settings if notification storage fails", async () => {
  const db = openDatabase(":memory:"),
    auth = createAuthService(db, createSessionStore(db), config);
  try {
    db.exec(
      "CREATE TRIGGER fail_event BEFORE INSERT ON notifications BEGIN SELECT RAISE(ABORT,'fail'); END",
    );
    await assert.rejects(
      auth.register("a@example.com", signup().password, "A", "native", "ip"),
    );
    assert.equal(db.prepare("SELECT count(*) n FROM users").get()!.n, 0);
    assert.equal(db.prepare("SELECT count(*) n FROM sessions").get()!.n, 0);
    db.exec("DROP TRIGGER fail_event");
    await auth.register(
      "a@example.com",
      signup().password,
      "A",
      "native",
      "ip",
    );
  } finally {
    db.close();
  }
});
test("authentication attempts are rate limited before unbounded password work", async () => {
  const db = openDatabase(":memory:"),
    auth = createAuthService(db, createSessionStore(db), config);
  try {
    for (let i = 0; i < 15; i++)
      await assert.rejects(
        auth.login("missing@example.com", "wrong password 123", "native", "ip"),
        (e) => (e as { status: number }).status === 401,
      );
    await assert.rejects(
      auth.login("missing@example.com", "wrong password 123", "native", "ip"),
      (e) => (e as { status: number }).status === 429,
    );
  } finally {
    db.close();
  }
});
test("migration from v2 preserves user IDs, dependent data and existing sessions, and removes callback tables", () => {
  const db = new DatabaseSync(":memory:");
  db.exec(
    "PRAGMA foreign_keys=ON; CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY,checksum TEXT NOT NULL,applied_at TEXT NOT NULL) STRICT",
  );
  for (const [i, file] of ["001-foundation.sql", "002-auth.sql"].entries()) {
    const sql = readFileSync(
      new URL("../src/database/migrations/" + file, import.meta.url),
      "utf8",
    );
    db.exec(sql);
    db.prepare("INSERT INTO schema_migrations VALUES (?,?,?)").run(
      i + 1,
      createHash("sha256").update(sql.replaceAll("\r\n", "\n")).digest("hex"),
      new Date().toISOString(),
    );
  }
  const token = randomBytes(32).toString("base64url");
  db.prepare("INSERT INTO users VALUES (?,?,?)").run(
    "legacy-id",
    "123",
    new Date().toISOString(),
  );
  db.exec(
    "INSERT INTO settings(user_id) VALUES ('legacy-id'); INSERT INTO favorites VALUES ('legacy-id','hero','1','now')",
  );
  db.prepare("INSERT INTO sessions VALUES (?,?,?,?,?)").run(
    createHash("sha256").update(token).digest("hex"),
    "legacy-id",
    "native",
    Date.now() + 60000,
    new Date().toISOString(),
  );
  try {
    migrate(db);
    migrate(db);
    assert.equal(
      createSessionStore(db).resolve(token)!.principal.user_id,
      "legacy-id",
    );
    assert.equal(db.prepare("SELECT count(*) n FROM favorites").get()!.n, 1);
    assert.equal(db.prepare("SELECT email FROM users").get()!.email, null);
    assert.equal(db.prepare("PRAGMA foreign_key_check").all().length, 0);
    assert.equal(
      db
        .prepare("SELECT name FROM sqlite_master WHERE name='auth_flows'")
        .get(),
      undefined,
    );
  } finally {
    db.close();
  }
});
