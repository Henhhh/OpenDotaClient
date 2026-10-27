import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { request as httpRequest } from "node:http";
import type { AddressInfo } from "node:net";
import { z } from "zod";
import { loadConfig } from "../src/core/config.ts";
import {
  requestContext,
  cors,
  jsonBody,
  ensureDeadline,
  notFound,
} from "../src/core/middleware.ts";
import {
  ApiError,
  endpoint,
  errorHandler,
  query,
  body,
  empty,
  accountId,
  numericId,
  opaqueId,
  dateRange,
} from "../src/core/http.ts";
import { createHealthRouter } from "../src/core/health.ts";
import { createApp } from "../src/app.ts";

async function host(app: express.Express, run: (url: string) => Promise<void>) {
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  try {
    await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((e) => (e ? reject(e) : resolve())),
    );
  }
}
function setup(timeoutMs = 20000) {
  const app = express();
  app.use(
    requestContext(timeoutMs),
    cors(new Set(["http://localhost:8081"])),
    jsonBody,
    ensureDeadline,
  );
  return app;
}

test("config defaults, exact origins and strict numbers/booleans are shared by bootstrap", () => {
  const c = loadConfig({});
  assert.equal(c.port, 3000);
  assert.equal(c.auth, undefined);
  assert.equal(c.databasePath, "./data/opendota.sqlite");
  assert.equal(
    loadConfig({ ENABLE_ACCOUNT_FEATURES: "true" }).auth!.production,
    false,
  );
  assert.deepEqual(
    loadConfig({ WEB_ORIGINS: " http://localhost:8081 , https://example.com " })
      .allowedWebOrigins,
    ["http://localhost:8081", "https://example.com"],
  );
  for (const env of [
    { PORT: "-1" },
    { PORT: "65536" },
    { PORT: "03" },
    { HOST: "http://localhost" },
    { WEB_ORIGINS: "*" },
    { WEB_ORIGINS: "https://example.com/" },
    { ENABLE_ACCOUNT_FEATURES: "yes" },
    { ENABLE_HERO_RANKINGS: "1" },
    { DATABASE_PATH: " " },
    { NODE_ENV: "typo" },
  ])
    assert.throws(() => loadConfig(env));
  assert.throws(
    () =>
      loadConfig({ NODE_ENV: "production", ENABLE_ACCOUNT_FEATURES: "true" }),
    /HTTPS/,
  );
});
test("shared ID and date schemas reject lossy, noncanonical or invalid filter values", () => {
  assert.equal(numericId.parse("99999999999999999999"), "99999999999999999999");
  assert.equal(accountId.parse("4294967295"), "4294967295");
  for (const value of ["0", "01", "-1", "1e3", "4294967296"])
    assert.equal(accountId.safeParse(value).success, false);
  assert.equal(opaqueId.parse("job-uuid"), "job-uuid");
  assert.deepEqual(dateRange.parse({ from: "0" }), { from: 0 });
  assert.deepEqual(dateRange.parse({ to: "123" }), { to: 123 });
  for (const input of [
    { from: "1", to: "1" },
    { from: "2", to: "1" },
    { from: "1e3" },
    { to: "9007199254740992" },
    { from: "00" },
  ])
    assert.equal(dateRange.safeParse(input).success, false);
});
test("health and not-found envelopes include matching generated request IDs, independent of upstream", async () => {
  let calls = 0;
  const backend = createApp({
    databasePath: ":memory:",
    allowedWebOrigins: [],
    client: {
      async get() {
        calls++;
        throw Error("No upstream");
      },
      async post() {
        calls++;
        throw Error("No upstream");
      },
    },
  });
  try {
    await host(backend.app, async (url) => {
      const response = await fetch(url + "/api/v1/health", {
        headers: { "X-Request-Id": "untrusted" },
      });
      const health = await response.json();
      assert.equal(response.status, 200);
      assert.deepEqual(health.data, { status: "ok", version: "v1" });
      assert.equal(health.meta.source, "aggregate");
      assert.equal(
        health.meta.request_id,
        response.headers.get("x-request-id"),
      );
      assert.notEqual(health.meta.request_id, "untrusted");
      assert.ok(Number.isFinite(Date.parse(health.meta.fetched_at)));
      assert.equal(calls, 0);
      const unknown = await fetch(url + "/api/v1/missing");
      assert.equal(unknown.status, 404);
      assert.equal(
        (await unknown.json()).request_id,
        unknown.headers.get("x-request-id"),
      );
      assert.equal((await fetch(url + "/api/v1/health?extra=1")).status, 400);
    });
  } finally {
    backend.close();
  }
});
test("strict query/body parsing and JSON pointer null metadata stay consistent across modules", async () => {
  const app = setup();
  app.post(
    "/test",
    endpoint(async (req) => {
      query(req, empty);
      body(req, z.object({ name: z.string() }).strict());
      return {
        data: { "a/b": null, "x~y": [null] },
        source: "database",
        fetched_at: new Date().toISOString(),
      };
    }),
  );
  app.use(errorHandler);
  await host(app, async (url) => {
    const ok = await fetch(url + "/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: '{"name":"ok"}',
    });
    assert.deepEqual((await ok.json()).meta.unavailable_fields, [
      "/data/a~1b",
      "/data/x~0y/0",
    ]);
    for (const suffix of ["?x=1", "?x=1&x=2"])
      assert.equal(
        (
          await fetch(url + "/test" + suffix, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: '{"name":"ok"}',
          })
        ).status,
        400,
      );
    for (const payload of [
      "{bad",
      "1",
      '{"name":"ok","extra":1}',
      JSON.stringify({ name: "x".repeat(33000) }),
    ]) {
      const r = await fetch(url + "/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: payload,
      });
      assert.equal(r.status, 400);
      const e = await r.json();
      assert.equal(e.error.code, "VALIDATION_ERROR");
      assert.equal(e.request_id, r.headers.get("x-request-id"));
    }
    assert.equal(
      (
        await fetch(url + "/test", {
          method: "POST",
          headers: { "content-type": "text/plain" },
          body: "hello",
        })
      ).status,
      400,
    );
  });
});
test("unexpected exceptions never expose stack/secrets and 429 always provides integer Retry-After", async () => {
  const app = setup();
  app.get("/secret", () => {
    throw Error("password=must-not-appear");
  });
  app.get("/quota", () => {
    throw new ApiError(429, "RATE_LIMITED", "Rate limited", 0.1);
  });
  app.get("/quota-default", () => {
    throw new ApiError(429, "RATE_LIMITED", "Rate limited");
  });
  app.use(errorHandler);
  await host(app, async (url) => {
    const r = await fetch(url + "/secret");
    const raw = await r.text();
    assert.equal(r.status, 500);
    assert.ok(!raw.includes("password"));
    assert.ok(!raw.includes("stack"));
    const q = await fetch(url + "/quota");
    assert.equal(q.status, 429);
    assert.equal(q.headers.get("retry-after"), "1");
    assert.equal((await q.json()).error.retry_after_seconds, 1);
    const fallback = await fetch(url + "/quota-default");
    assert.equal(fallback.headers.get("retry-after"), "60");
  });
});
test("CORS credentials only use exact allowlisted origins; preflight errors use the common envelope", async () => {
  const app = setup();
  app.use(createHealthRouter());
  app.use(notFound, errorHandler);
  await host(app, async (url) => {
    const ok = await fetch(url + "/health", {
      headers: { Origin: "http://localhost:8081" },
    });
    assert.equal(
      ok.headers.get("access-control-allow-origin"),
      "http://localhost:8081",
    );
    assert.equal(ok.headers.get("access-control-allow-credentials"), "true");
    assert.match(ok.headers.get("vary")!, /Origin/);
    const evil = await fetch(url + "/health", {
      headers: { Origin: "https://evil.example" },
    });
    assert.equal(evil.headers.get("access-control-allow-origin"), null);
    const pre = await fetch(url + "/health", {
      method: "OPTIONS",
      headers: {
        Origin: "https://evil.example",
        "Access-Control-Request-Method": "POST",
      },
    });
    assert.equal(pre.status, 403);
    assert.equal((await pre.json()).error.code, "FORBIDDEN");
    const allowed = await fetch(url + "/health", {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:8081",
        "Access-Control-Request-Method": "PATCH",
      },
    });
    assert.equal(allowed.status, 204);
  });
});
test("one request deadline aborts services and returns 504 even when a handler ignores cancellation", async () => {
  const app = setup(50);
  let signal: AbortSignal | undefined;
  let deadline: number | undefined;
  app.get(
    "/slow",
    endpoint(async (req, c) => {
      signal = c.signal;
      deadline = c.deadline_ms;
      assert.equal(deadline, req.res!.locals.deadline_ms);
      return new Promise<never>(() => {});
    }),
  );
  app.use(errorHandler);
  await host(app, async (url) => {
    const r = await fetch(url + "/slow");
    assert.equal(r.status, 504);
    assert.equal((await r.json()).error.code, "UPSTREAM_TIMEOUT");
    assert.equal(signal!.aborted, true);
    assert.ok(deadline! <= Date.now());
  });
});
test("endpoint standalone fallback also enforces an absolute deadline without middleware", async () => {
  const app = express();
  app.use((_req, res, next) => {
    res.locals.deadline_ms = Date.now() + 25;
    next();
  });
  app.get(
    "/slow",
    endpoint(async () => new Promise<never>(() => {})),
  );
  app.use(errorHandler);
  await host(app, async (url) => {
    assert.equal((await fetch(url + "/slow")).status, 504);
  });
});
test("client disconnection cancels the service signal without waiting for the deadline", async () => {
  const app = setup();
  let entered: () => void = () => {};
  let cancelled: () => void = () => {};
  const started = new Promise<void>((r) => {
    entered = r;
  });
  const aborted = new Promise<void>((r) => {
    cancelled = r;
  });
  app.get(
    "/cancel",
    endpoint(async (_req, c) => {
      c.signal.addEventListener("abort", cancelled, { once: true });
      entered();
      return new Promise<never>(() => {});
    }),
  );
  app.use(errorHandler);
  await host(app, async (url) => {
    const req = httpRequest(url + "/cancel");
    req.on("error", () => {});
    req.end();
    await started;
    req.destroy();
    await aborted;
  });
});
