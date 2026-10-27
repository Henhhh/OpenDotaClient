import { test } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { OpenDotaClient } from "../../shared/api-contract.ts";
import { createApp } from "../src/app.ts";
import { UpstreamError } from "../src/integrations/opendota/errors.ts";

const time = "2026-10-27T00:00:00Z";
const team = (
  id: number,
  rating: number | null = null,
  wins: number | null = null,
  losses: number | null = null,
) => ({ team_id: id, name: `Team ${id}`, rating, wins, losses });
const match = (id: number, start: number) => ({
  match_id: id,
  start_time: start,
  duration: 1200,
  game_mode: 1,
  lobby_type: 1,
  radiant_win: true,
  leagueid: 1,
  radiant_team_id: 1,
  dire_team_id: 2,
});
const fixtures: Record<string, unknown> = {
  "/teams": [team(10), team(2, 1500, 0, 0), team(1, 1500, 2, 1)],
  "/teams/1": team(1, 1500, 2, 1),
  "/teams/1/players": [
    { account_id: 10, name: "Past", is_current_team_member: false },
    { account_id: 2, name: "Current", is_current_team_member: true },
  ],
  "/proPlayers": [
    { account_id: 10, name: "Alpha", team_id: 1 },
    { account_id: 2, personaname: "Beta", team_id: 2 },
    { account_id: 20, personaname: "Free Agent", team_id: 0 },
  ],
  "/leagues": [
    { leagueid: 2, name: "League Two" },
    { leagueid: 10, name: "League Ten" },
  ],
  "/leagues/1": { leagueid: 1, name: "League One" },
  "/leagues/1/teams": [team(10), team(2)],
  "/leagues/1/matches": [match(2, 100), match(1, 200)],
  "/teams/1/matches": [match(2, 100), { ...match(1, 200), leagueid: 2 }],
  "/proMatches": [match(2, 100), match(1, 200)],
  "/matches/1": match(1, 200),
};
const authConfig = {
  webOrigins: ["http://localhost:8081"],
  production: false,
};
function client(overrides: Record<string, unknown> = {}): OpenDotaClient {
  return {
    async get(path, _query, options) {
      const raw = Object.hasOwn(overrides, path)
        ? overrides[path]
        : fixtures[path];
      if (raw instanceof Error) throw raw;
      if (raw === undefined) throw new UpstreamError("not_found");
      try {
        return {
          data: options.validate(structuredClone(raw)),
          fetched_at: time,
        };
      } catch {
        throw new UpstreamError("invalid_response");
      }
    },
    async post() {
      throw new Error("Unexpected upstream POST");
    },
  };
}
async function host(
  run: (ctx: {
    url: string;
    backend: ReturnType<typeof createApp>;
    call: (
      path: string,
      init?: RequestInit,
    ) => Promise<{ status: number; body: any; headers: Headers }>;
  }) => Promise<void>,
  options: { overrides?: Record<string, unknown>; disabled?: boolean } = {},
) {
  const backend = createApp({
    client: client(options.overrides),
    databasePath: ":memory:",
    allowedWebOrigins: authConfig.webOrigins,
    auth: options.disabled ? undefined : authConfig,
  });
  const server = backend.app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
  const call = async (path: string, init?: RequestInit) => {
    const r = await fetch(url + path, { redirect: "manual", ...init });
    const body = r.status === 204 || r.status === 302 ? null : await r.json();
    return { status: r.status, body, headers: r.headers };
  };
  try {
    await run({ url, backend, call });
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((e) => (e ? reject(e) : resolve())),
    );
    backend.close();
  }
}
const json = (
  method: string,
  body: unknown,
  headers: Record<string, string> = {},
): RequestInit => ({
  method,
  headers: { "content-type": "application/json", ...headers },
  body: JSON.stringify(body),
});

test("Pro teams sort nulls last, stable numeric ties, filter before pagination and validate strictly", async () => {
  await host(async ({ call }) => {
    const r = await call("/pro/teams?limit=1&offset=1");
    assert.equal(r.status, 200);
    assert.equal(r.body.data.items[0].team_id, "2");
    assert.equal(r.body.data.total, 3);
    assert.equal(r.body.data.has_more, true);
    assert.equal(
      (await call("/pro/teams?sort=win_rate")).body.data.items[0].team_id,
      "1",
    );
    assert.equal((await call("/pro/teams?q=missing")).body.data.total, 0);
    for (const path of [
      "/pro/teams?sort=bogus",
      "/pro/teams?limit=0",
      "/pro/teams?q=a&q=b",
      "/pro/teams?region=eu",
      "/pro/teams/01",
      "/pro/teams/1?extra=1",
    ])
      assert.equal((await call(path)).status, 400, path);
    const detail = await call("/pro/teams/1");
    assert.equal(detail.body.data.region, null);
    assert.ok(detail.body.meta.unavailable_fields.includes("/data/region"));
    assert.equal(
      detail.headers.get("x-request-id"),
      detail.body.meta.request_id,
    );
  });
});
test("Pro players, historic roster and leagues preserve unknown metadata", async () => {
  await host(async ({ call }) => {
    assert.deepEqual(
      (await call("/pro/players")).body.data.items.map(
        (p: any) => p.account_id,
      ),
      ["2", "10", "20"],
    );
    const p = await call("/pro/players?q=alpha&team_id=1");
    assert.equal(p.body.data.total, 1);
    assert.equal(p.body.data.items[0].real_name, null);
    const roster = (await call("/pro/teams/1/players")).body.data.items;
    assert.equal(roster[0].team_id, "1");
    assert.equal(roster[1].team_id, null);
    assert.deepEqual(
      (await call("/pro/leagues")).body.data.items.map((l: any) => l.league_id),
      ["10", "2"],
    );
    assert.equal((await call("/pro/leagues/1")).body.data.prize_usd, null);
    assert.deepEqual(
      (await call("/pro/leagues/1/teams")).body.data.items.map(
        (t: any) => t.team_id,
      ),
      ["2", "10"],
    );
    assert.equal((await call("/pro/leagues?status=live")).status, 400);
  });
});
test("Pro matches filter source snapshot, sort by time and enrich missing mode without fabrication", async () => {
  await host(
    async ({ call }) => {
      const r = await call("/pro/matches?limit=1");
      assert.equal(r.body.data.items[0].match_id, "1");
      assert.equal(r.body.data.total, null);
      assert.equal(r.body.data.has_more, true);
      const filtered = await call("/pro/matches?team_id=1&league_id=1");
      assert.deepEqual(
        filtered.body.data.items.map((m: any) => m.match_id),
        ["2"],
      );
      assert.equal((await call("/pro/leagues/1/matches")).body.data.total, 2);
      assert.equal((await call("/pro/teams/1/matches")).body.data.total, 2);
      assert.equal((await call("/pro/live")).status, 501);
    },
    {
      overrides: {
        "/proMatches": [
          { match_id: 1, start_time: 200, duration: 1200 },
          match(2, 100),
        ],
      },
    },
  );
});
test("Pro errors distinguish missing, invalid data, timeout and quota", async () => {
  for (const [error, status] of [
    [new UpstreamError("not_found"), 404],
    [new UpstreamError("timeout"), 504],
    [new UpstreamError("rate_limited", 429, 13), 429],
    [{ team_id: 2, name: "Wrong ID" }, 502],
  ] as const) {
    await host(
      async ({ call }) => {
        const r = await call("/pro/teams/1");
        assert.equal(r.status, status);
        assert.ok(r.body.request_id);
        if (status === 429) assert.equal(r.headers.get("retry-after"), "13");
      },
      { overrides: { "/teams/1": error } },
    );
  }
});
test("empty upstream detail responses require catalog confirmation before becoming 404", async () => {
  await host(
    async ({ call }) => {
      assert.equal((await call("/pro/teams/99")).status, 404);
      assert.equal((await call("/pro/leagues/99")).status, 404);
      assert.equal((await call("/pro/teams/1")).status, 502);
    },
    { overrides: { "/teams/99": null, "/leagues/99": null, "/teams/1": null } },
  );
});

test("ME endpoints enforce session, favorite idempotency, settings merge and strict mutation schema", async () => {
  await host(async ({ call, backend }) => {
    assert.equal((await call("/me/settings")).status, 401);
    const a = backend.foundation.sessions.createForVerifiedAccount(
        "1",
        "native",
      ),
      b = backend.foundation.sessions.createForVerifiedAccount("2", "native");
    const headers = { authorization: `Bearer ${a.token}` };
    const put = () => call("/me/favorites/hero/17", json("PUT", {}, headers));
    const first = await put(),
      again = await put();
    assert.equal(first.status, 200);
    assert.deepEqual(first.body.data, again.body.data);
    assert.equal(
      (
        await call("/me/favorites", {
          headers: { authorization: `Bearer ${b.token}` },
        })
      ).body.data.total,
      0,
    );
    assert.equal(
      (await call("/me/favorites?kind=hero", { headers })).body.data.total,
      1,
    );
    assert.equal(
      (await call("/me/settings", json("PATCH", { language: "vi" }, headers)))
        .body.data.theme,
      "dark",
    );
    assert.equal(
      (await call("/me/settings", { headers })).body.data.language,
      "vi",
    );
    for (const value of [{}, { user_id: "forged" }, { theme: "bogus" }])
      assert.equal(
        (await call("/me/settings", json("PATCH", value, headers))).status,
        400,
      );
    assert.equal(
      (await call("/me/favorites/hero/01", json("PUT", {}, headers))).status,
      400,
    );
    assert.equal(
      (await call("/me/favorites/hero/17", json("DELETE", {}, headers))).status,
      204,
    );
    assert.equal(
      (await call("/me/favorites/hero/17", json("DELETE", {}, headers))).status,
      204,
    );
  });
});
test("notification event deduplication, user isolation, unread filters, read-all and opt-out", async () => {
  await host(async ({ call, backend }) => {
    const a = backend.foundation.sessions.createForVerifiedAccount(
        "1",
        "native",
      ),
      b = backend.foundation.sessions.createForVerifiedAccount("2", "native"),
      headers = { authorization: `Bearer ${a.token}` };
    const event = {
      kind: "system" as const,
      title: "Real event",
      body: "Event body",
      target: null,
    };
    const n = backend.foundation.me.notify(
      a.principal.user_id,
      "event-1",
      event,
    )!;
    assert.equal(
      backend.foundation.me.notify(a.principal.user_id, "event-1", event)!
        .notification_id,
      n.notification_id,
    );
    assert.equal(
      (await call("/me/notifications?unread=false", { headers })).body.data
        .total,
      0,
    );
    assert.equal(
      (
        await call(
          `/me/notifications/${n.notification_id}`,
          json("PATCH", { read: true }, { authorization: `Bearer ${b.token}` }),
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await call(
          `/me/notifications/${n.notification_id}`,
          json("PATCH", { read: true }, headers),
        )
      ).status,
      200,
    );
    assert.equal(
      (await call("/me/notifications?unread=false", { headers })).body.data
        .total,
      1,
    );
    backend.foundation.me.notify(a.principal.user_id, "event-2", event);
    assert.equal(
      (await call("/me/notifications/read-all", json("POST", {}, headers))).body
        .data.updated,
      1,
    );
    assert.equal(
      (await call("/me/notifications/read-all", json("POST", {}, headers))).body
        .data.updated,
      0,
    );
    await call(
      "/me/settings",
      json("PATCH", { in_app_notifications: false }, headers),
    );
    assert.equal(
      backend.foundation.me.notify(a.principal.user_id, "event-3", event),
      null,
    );
    assert.equal(
      (await call("/me/notifications?unread=yes", { headers })).status,
      400,
    );
  });
});
test("read-all cutoff preserves notifications created after request starts even with identical timestamps", async () => {
  await host(async ({ backend }) => {
    const user = backend.foundation.sessions.createForVerifiedAccount(
      "1",
      "native",
    ).principal.user_id;
    const event = {
      kind: "system" as const,
      title: "Event",
      body: "Body",
      target: null,
    };
    backend.foundation.me.notify(user, "before", event);
    const boundary = backend.foundation.me.notificationBoundary();
    backend.foundation.me.notify(user, "after", event);
    assert.equal(backend.foundation.me.readAll(user, boundary).updated, 1);
    assert.equal(backend.foundation.me.notifications(user, true).length, 1);
  });
});
