import { test } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type {
  OpenDotaClient,
  UpstreamGetOptions,
} from "../../shared/api-contract.ts";
import { createApp } from "../src/app.ts";
import { UpstreamError } from "../src/integrations/opendota/errors.ts";
import { ParseService } from "../src/modules/matches/parse-service.ts";
import { MatchesService } from "../src/modules/matches/service.ts";

const time = "2026-10-27T00:00:00Z";
const profile = (id: number) => ({
  profile: {
    account_id: id,
    personaname: `Player ${id}`,
    steamid: String(76561197960265728n + BigInt(id)),
    avatarfull: "https://example.com/avatar.png",
  },
  rank_tier: 54,
});
const history = (
  id: number,
  start: number,
  slot = 0,
  win: boolean | null = true,
) => ({
  match_id: id,
  start_time: start,
  duration: 1200,
  game_mode: 22,
  lobby_type: 7,
  radiant_win: win,
  player_slot: slot,
  hero_id: 1,
  kills: 10,
  deaths: 2,
  assists: 6,
  gold_per_min: 500,
  xp_per_min: 600,
  version: null,
});
const detail = (id = 123, version: number | null = 1) => ({
  match_id: id,
  start_time: 200,
  duration: 1200,
  game_mode: 22,
  lobby_type: 7,
  radiant_win: true,
  radiant_score: 30,
  dire_score: 20,
  version,
  players: [
    {
      player_slot: 0,
      account_id: null,
      hero_id: 1,
      kills: 10,
      deaths: 2,
      assists: 6,
      item_0: 1,
      item_1: 0,
      backpack_0: 2,
      item_neutral: 0,
      purchase_log: [{ key: "blink", time: -30 }],
      ability_upgrades_arr: [5001, 5002],
    },
  ],
  picks_bans: [{ order: 0, is_pick: true, hero_id: 1, team: 0 }],
  radiant_gold_adv: [0, 100, -200],
  radiant_xp_adv: [0, 200],
});
const base: Record<string, unknown> = {
  "/players/1": profile(1),
  "/players/2": profile(2),
  "/players/1/matches": [
    history(10, 100),
    history(2, 200, 128, false),
    history(3, 300, 0, null),
  ],
  "/players/1/recentMatches": [
    history(10, 100),
    history(2, 200, 128, false),
    history(3, 300, 0, null),
  ],
  "/players/2/recentMatches": [],
  "/players/1/wl": { win: 2, lose: 1 },
  "/players/2/wl": { win: 0, lose: 0 },
  "/players/1/totals": [
    { field: "kills", n: 2, sum: 20 },
    { field: "deaths", n: 2, sum: 4 },
    { field: "assists", n: 2, sum: 12 },
    { field: "gold_per_min", n: 1, sum: 500 },
    { field: "xp_per_min", n: 2, sum: 1200 },
    { field: "duration", n: 2, sum: 2400 },
  ],
  "/players/2/totals": [],
  "/players/1/heroes": [
    { hero_id: 10, games: 5, win: 4, last_played: 100 },
    { hero_id: 2, games: 5, win: 3, last_played: 100 },
    { hero_id: 1, games: 0, win: 0, last_played: 0 },
  ],
  "/players/1/peers": [
    {
      account_id: 10,
      games: 1000,
      win: 900,
      with_games: 5,
      with_win: 3,
      personaname: "Peer 10",
    },
    { account_id: 2, with_games: 5, with_win: 4 },
  ],
  "/players/1/ratings": [
    { account_id: 1, time: 100, rank_tier: 51 },
    { account_id: 1, time: 100, rank_tier: 52 },
    { account_id: 1, time: 200, rank_tier: 53 },
  ],
  "/matches/123": detail(),
  "/constants/items": { blink: { id: 1, dname: "Blink", cost: 2250 } },
  "/request/777": { id: 777, type: "parse", data: { match_id: 123 } },
};
function fake(overrides: Record<string, unknown> = {}) {
  const values = { ...base, ...overrides },
    calls: { path: string; query: unknown; ttl: number }[] = [],
    posts: string[] = [];
  let postError: Error | undefined;
  const client: OpenDotaClient = {
    async get<T>(path: string, query: unknown, options: UpstreamGetOptions<T>) {
      calls.push({ path, query, ttl: options.ttl_seconds });
      assert.ok(options.deadline_ms > Date.now());
      assert.ok(options.signal);
      assert.ok(options.cache_namespace);
      const raw = values[path];
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
    async post(path, _body, options) {
      posts.push(path);
      if (postError) throw postError;
      await new Promise((r) => setTimeout(r, 15));
      try {
        return {
          data: options.validate(
            values["POST /request"] ?? { job: { jobId: 777 } },
          ),
          fetched_at: time,
        };
      } catch {
        throw new UpstreamError("invalid_response");
      }
    },
  };
  return {
    client,
    values,
    calls,
    posts,
    setPostError: (error: Error) => {
      postError = error;
    },
  };
}
async function host(
  run: (ctx: {
    call: (
      path: string,
      init?: RequestInit,
    ) => Promise<{ status: number; body: any; headers: Headers }>;
    backend: ReturnType<typeof createApp>;
    fake: ReturnType<typeof fake>;
  }) => Promise<void>,
  options: { overrides?: Record<string, unknown>; parse?: boolean } = {},
) {
  const f = fake(options.overrides),
    backend = createApp({
      client: f.client,
      databasePath: ":memory:",
      allowedWebOrigins: ["http://localhost:8081"],
      enableMatchParse: options.parse,
      auth: {
        production: false,
        webOrigins: ["http://localhost:8081"],
      },
    });
  const server = backend.app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
  const call = async (path: string, init?: RequestInit) => {
    const r = await fetch(url + path, init);
    return { status: r.status, body: await r.json(), headers: r.headers };
  };
  try {
    await run({ call, backend, fake: f });
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((e) => (e ? reject(e) : resolve())),
    );
    backend.close();
  }
}
const post = (token: string): RequestInit => ({
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: "{}",
});

test("History excludes numeric hero 0 before pagination and recent stats but still rejects malformed hero IDs", async () => {
  const rows = [{ ...history(1, 400), hero_id: 0 }, history(2, 300)];
  await host(
    async ({ call, fake }) => {
      const historyResult = await call("/players/1/matches?limit=1");
      assert.equal(historyResult.status, 200);
      assert.equal(historyResult.body.data.total, 1);
      assert.equal(historyResult.body.data.has_more, false);
      assert.equal(historyResult.body.data.items[0].match_id, "2");
      const recent = await call("/players/1/stats?scope=recent");
      assert.equal(recent.status, 200);
      assert.equal(recent.body.data.sample_size, 1);
      assert.equal(recent.body.data.matches, 1);
      fake.values["/players/1/matches"] = [{ ...history(1, 400), hero_id: -1 }];
      assert.equal((await call("/players/1/matches")).status, 502);
    },
    {
      overrides: {
        "/players/1/matches": rows,
        "/players/1/recentMatches": rows,
      },
    },
  );
});

test("Recent scope is capped at 20 and missing metrics stay null rather than zero", async () => {
  const rows = Array.from({ length: 25 }, (_, i) => history(i + 1, i + 1));
  delete (rows[24] as { gold_per_min?: number }).gold_per_min;
  await host(
    async ({ call }) => {
      const r = await call("/players/1/stats?scope=recent");
      assert.equal(r.body.data.matches, 20);
      assert.equal(r.body.data.sample_size, 20);
      assert.equal(r.body.data.avg_gpm, null);
      assert.equal(r.body.data.avg_xpm, 600);
    },
    { overrides: { "/players/1/recentMatches": rows } },
  );
});
test("Anonymous match account placeholders are normalized without inventing identities", async () => {
  const m = detail();
  await host(async ({ call, fake }) => {
    for (const id of [0, 4294967295]) {
      fake.values["/matches/123"] = {
        ...m,
        players: [{ ...m.players[0], account_id: id }],
      };
      const r = await call("/matches/123");
      assert.equal(r.status, 200);
      assert.equal(r.body.data.players[0].account_id, null);
    }
  });
});
test("Parse rejects unexpected body fields before submitting an upstream job", async () => {
  await host(
    async ({ call, backend, fake }) => {
      const token = backend.foundation.sessions.createForVerifiedAccount(
        "1",
        "native",
      ).token;
      const request = post(token);
      request.body = '{"user_id":"forged"}';
      assert.equal((await call("/matches/123/parse", request)).status, 400);
      assert.equal(fake.posts.length, 0);
    },
    { parse: true },
  );
});
test("Invalid parse acknowledgement stays unknown and upstream rejection permits only explicit retries", async () => {
  await host(
    async ({ call, backend, fake }) => {
      const token = backend.foundation.sessions.createForVerifiedAccount(
        "1",
        "native",
      ).token;
      fake.values["POST /request"] = { job: {} };
      assert.equal((await call("/matches/123/parse", post(token))).status, 502);
      const retry = await call("/matches/123/parse", post(token));
      assert.equal(retry.body.data.status, "unknown");
      assert.equal(fake.posts.length, 1);
    },
    { parse: true, overrides: { "/matches/123": detail(123, null) } },
  );
  await host(
    async ({ call, backend, fake }) => {
      const token = backend.foundation.sessions.createForVerifiedAccount(
        "1",
        "native",
      ).token;
      fake.setPostError(new UpstreamError("rate_limited", 429, 12));
      const first = await call("/matches/123/parse", post(token));
      assert.equal(first.status, 429);
      assert.equal(first.headers.get("retry-after"), "12");
      assert.equal(fake.posts.length, 1);
      assert.equal((await call("/matches/123/parse", post(token))).status, 429);
      assert.equal(fake.posts.length, 2);
    },
    { parse: true, overrides: { "/matches/123": detail(123, null) } },
  );
});
test("Parse polls reject mismatched upstream jobs and never trust completed without match data", async () => {
  for (const [raw, expected, status] of [
    [{ id: 777, state: "failed" }, "failed", 200],
    [{ id: 777, type: "parse", state: "completed" }, "unknown", 200],
    [{ id: 778, state: "queued" }, null, 502],
    [{ id: 777, data: { match_id: 999 } }, null, 502],
  ] as const) {
    await host(
      async ({ call, backend, fake }) => {
        const token = backend.foundation.sessions.createForVerifiedAccount(
          "1",
          "native",
        ).token;
        const created = await call("/matches/123/parse", post(token));
        fake.values["/request/777"] = raw;
        const r = await call("/parse-jobs/" + created.body.data.job_id, {
          headers: { authorization: `Bearer ${token}` },
        });
        assert.equal(r.status, status);
        assert.equal(r.headers.get("cache-control"), "no-store");
        if (status === 200) assert.equal(r.body.data.status, expected);
      },
      { parse: true, overrides: { "/matches/123": detail(123, null) } },
    );
  }
});

test("Players profile maps identity and preserves nullable public status without estimating MMR", async () => {
  await host(async ({ call }) => {
    const r = await call("/players/1");
    assert.equal(r.status, 200);
    assert.equal(r.body.data.account_id, "1");
    assert.equal(r.body.data.name, "Player 1");
    assert.equal(r.body.data.is_public, null);
    assert.equal(r.body.data.steam_id, "76561197960265729");
    assert.equal(r.body.data.mmr_estimate, undefined);
    assert.equal(r.headers.get("x-request-id"), r.body.meta.request_id);
  });
});
test("Players reject unknown/duplicate filters, invalid uint32 IDs and invalid compare inputs", async () => {
  await host(async ({ call }) => {
    for (const path of [
      "/players/01",
      "/players/4294967296",
      "/players/1?x=1",
      "/players/1/stats?scope=wrong",
      "/players/1/matches?lane=1",
      "/players/1/matches?hero_id=1&hero_id=2",
      "/players/1/matches?from=200&to=100",
      "/players/1/matches?from=1e3",
      "/players/compare?account_ids=1,1",
      "/players/compare?account_ids=1",
      "/players/compare?account_ids=01,2",
    ])
      assert.equal((await call(path)).status, 400, path);
  });
});
test("Player history applies exact date bounds, result and ordering before pagination", async () => {
  await host(async ({ call, fake }) => {
    const r = await call("/players/1/matches?from=100&to=300&limit=1&offset=1");
    assert.equal(r.status, 200);
    assert.equal(r.body.data.items[0].match_id, "10");
    assert.equal(r.body.data.total, 2);
    assert.equal(r.body.data.has_more, false);
    const wins = await call(
      "/players/1/matches?result=win&hero_id=1&game_mode=22&lobby_type=7",
    );
    assert.deepEqual(
      wins.body.data.items.map((m: any) => m.match_id),
      ["2", "10"],
    );
    assert.ok(wins.body.data.items.every((m: any) => m.won === true));
    const request = fake.calls
      .filter((c) => c.path.endsWith("/matches"))
      .at(-1)!;
    assert.deepEqual(request.query, {
      hero_id: "1",
      win: 1,
      game_mode: 22,
      lobby_type: 7,
    });
    const upper = await call("/players/1/matches?to=200");
    assert.equal(upper.body.data.items.length, 1);
    const empty = await call("/players/1/matches?from=999");
    assert.deepEqual(empty.body.data.items, []);
  });
});
test("Recent stats count unknown outcomes separately and compute KDA from averages", async () => {
  await host(async ({ call }) => {
    const r = await call("/players/1/stats?scope=recent");
    assert.equal(r.status, 200);
    assert.equal(r.body.data.matches, 3);
    assert.equal(r.body.data.sample_size, 3);
    assert.equal(r.body.data.wins, 2);
    assert.equal(r.body.data.losses, 0);
    assert.equal(r.body.data.kda, 8);
    assert.equal(r.body.data.avg_gpm, 500);
    const zero = await call("/players/2/stats?scope=recent");
    assert.equal(zero.body.data.sample_size, 0);
    assert.equal(zero.body.data.win_rate, null);
    assert.equal(zero.body.data.avg_kills, null);
  });
});
test("All-time stats do not treat different aggregate sample sizes as one population", async () => {
  await host(async ({ call }) => {
    const r = await call("/players/1/stats");
    assert.equal(r.status, 200);
    assert.equal(r.body.data.wins, 2);
    assert.equal(r.body.data.sample_size, 2);
    assert.equal(r.body.data.avg_gpm, null);
    assert.equal(r.body.data.avg_xpm, 600);
    assert.equal(r.body.data.kda, 8);
    const zero = await call("/players/2/stats");
    assert.equal(zero.body.data.kda, null);
  });
});
test("Player heroes sort numeric ties; peers use with_games/with_win instead of opponents", async () => {
  await host(async ({ call }) => {
    const h = await call("/players/1/heroes");
    assert.deepEqual(
      h.body.data.items.map((h: any) => h.hero_id),
      ["2", "10"],
    );
    assert.equal(
      (await call("/players/1/heroes?sort=win_rate")).body.data.items[0]
        .hero_id,
      "10",
    );
    const p = await call("/players/1/peers");
    assert.deepEqual(
      p.body.data.items.map((p: any) => p.account_id),
      ["2", "10"],
    );
    assert.equal(p.body.data.items[1].games, 5);
    assert.equal(p.body.data.items[1].wins, 3);
  });
});
test("Rank history uses observed medals, removes duplicate times and returns 501 without data", async () => {
  await host(async ({ call, fake }) => {
    const r = await call("/players/1/rank-history");
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data.items, [
      { time: 200, rank_tier: 53, mmr: null },
      { time: 100, rank_tier: 52, mmr: null },
    ]);
    fake.values["/players/1/ratings"] = [];
    assert.equal((await call("/players/1/rank-history")).status, 501);
  });
});
test("Compare preserves caller order and resolves before parameter routes", async () => {
  await host(async ({ call }) => {
    const r = await call("/players/compare?account_ids=2,1&scope=recent");
    assert.equal(r.status, 200);
    assert.deepEqual(
      r.body.data.players.map((p: any) => p.profile.account_id),
      ["2", "1"],
    );
  });
});
test("Private/unavailable profiles do not turn hidden history into empty success", async () => {
  await host(async ({ call, fake }) => {
    fake.values["/players/1"] = {
      profile: { account_id: 1, fh_unavailable: true },
    };
    assert.equal((await call("/players/1")).body.data.is_public, false);
    for (const path of ["matches", "stats", "heroes", "peers", "rank-history"])
      assert.equal((await call("/players/1/" + path)).status, 403);
    fake.values["/players/1"] = { profile: null };
    assert.equal((await call("/players/1")).status, 404);
  });
});
test("Matches map slots, anonymous accounts, pregame purchases, skills, draft and graphs", async () => {
  await host(async ({ call }) => {
    const r = await call("/matches/123");
    assert.equal(r.status, 200);
    const m = r.body.data,
      p = m.players[0];
    assert.equal(m.parsed, true);
    assert.equal(p.account_id, null);
    assert.deepEqual(p.items, ["1", null, null, null, null, null]);
    assert.deepEqual(p.backpack, ["2", null, null]);
    assert.equal(p.neutral_item, null);
    assert.deepEqual(p.purchases, [{ item_id: "1", time: -30 }]);
    assert.deepEqual(p.ability_upgrades, ["5001", "5002"]);
    assert.deepEqual(m.radiant_gold_adv, [0, 100, -200]);
    assert.equal(m.picks_bans[0].hero_id, "1");
  });
});
test("Unparsed matches return basic stats with null analysis rather than demo data", async () => {
  await host(
    async ({ call, fake }) => {
      const r = await call("/matches/123");
      assert.equal(r.status, 200);
      assert.equal(r.body.data.parsed, false);
      assert.equal(r.body.data.players[0].purchases, null);
      assert.equal(r.body.data.players[0].ability_upgrades, null);
      assert.equal(r.body.data.radiant_gold_adv, null);
      assert.equal(
        fake.calls.some((c) => c.path === "/constants/items"),
        false,
      );
    },
    { overrides: { "/matches/123": detail(123, null) } },
  );
});
test("Unknown purchase item keys remain unavailable; malformed or wrong match identities return 502", async () => {
  await host(async ({ call, fake }) => {
    fake.values["/constants/items"] = {};
    const r = await call("/matches/123");
    assert.equal(r.body.data.players[0].purchases, null);
    fake.values["/matches/123"] = detail(999);
    assert.equal((await call("/matches/123")).status, 502);
    fake.values["/matches/123"] = {
      ...detail(),
      players: [detail().players[0], detail().players[0]],
    };
    assert.equal((await call("/matches/123")).status, 502);
  });
});
test("Players/Matches failures preserve upstream 404/429/504 and avoid false empty or missing results", async () => {
  for (const [error, status] of [
    [new UpstreamError("not_found"), 404],
    [new UpstreamError("rate_limited", 429, 12), 429],
    [new UpstreamError("timeout"), 504],
    [new UpstreamError("unavailable"), 502],
  ] as const) {
    await host(
      async ({ call }) => {
        const r = await call("/matches/123");
        assert.equal(r.status, status);
        if (status === 429) assert.equal(r.headers.get("retry-after"), "12");
      },
      { overrides: { "/matches/123": error } },
    );
  }
});
test("Parse is gated until enabled and requires a real session when enabled", async () => {
  await host(async ({ call }) => {
    assert.equal(
      (await call("/matches/123/parse", { method: "POST" })).status,
      501,
    );
    assert.equal((await call("/parse-jobs/missing")).status, 501);
  });
  await host(
    async ({ call }) => {
      assert.equal(
        (
          await call("/matches/123/parse", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: "{}",
          })
        ).status,
        401,
      );
      assert.equal((await call("/parse-jobs/missing")).status, 401);
    },
    { parse: true },
  );
});
test("Concurrent parse submissions share one upstream POST, grant each requester and isolate others", async () => {
  await host(
    async ({ call, backend, fake }) => {
      const a = backend.foundation.sessions.createForVerifiedAccount(
          "1",
          "native",
        ),
        b = backend.foundation.sessions.createForVerifiedAccount("2", "native"),
        c = backend.foundation.sessions.createForVerifiedAccount("3", "native");
      const [one, two] = await Promise.all([
        call("/matches/123/parse", post(a.token)),
        call("/matches/123/parse", post(b.token)),
      ]);
      assert.equal(one.status, 202);
      assert.equal(two.status, 202);
      assert.equal(one.body.data.job_id, two.body.data.job_id);
      assert.equal(fake.posts.length, 1);
      assert.equal(Object.hasOwn(one.body.data, "upstream_job_id"), false);
      const job = one.body.data.job_id;
      assert.equal(
        (
          await call("/parse-jobs/" + job, {
            headers: { authorization: `Bearer ${c.token}` },
          })
        ).status,
        404,
      );
      const allowed = await call("/parse-jobs/" + job, {
        headers: { authorization: `Bearer ${a.token}` },
      });
      assert.equal(allowed.status, 200);
      assert.equal(allowed.body.data.status, "queued");
      assert.ok(
        fake.calls
          .filter((c) => c.path === "/request/777")
          .every((c) => c.ttl === 0),
      );
      const n = fake.calls.length;
      await call("/parse-jobs/" + job, {
        headers: { authorization: `Bearer ${b.token}` },
      });
      assert.equal(fake.calls.length, n);
    },
    { parse: true, overrides: { "/matches/123": detail(123, null) } },
  );
});
test("Missing upstream job never implies completed; verified parsed data completes job and emits one event", async () => {
  await host(
    async ({ call, backend, fake }) => {
      const a = backend.foundation.sessions.createForVerifiedAccount(
        "1",
        "native",
      );
      const request = await call("/matches/123/parse", post(a.token)),
        job = request.body.data.job_id;
      fake.values["/request/777"] = null;
      const unknown = await call("/parse-jobs/" + job, {
        headers: { authorization: `Bearer ${a.token}` },
      });
      assert.equal(unknown.body.data.status, "unknown");
      assert.equal(
        backend.foundation.me.notifications(a.principal.user_id).length,
        0,
      );
      fake.values["/matches/123"] = detail();
      // Simulate a later poll/restarted service with the same durable store, without waiting five seconds.
      const service = new ParseService(
        fake.client,
        backend.foundation.parseJobs,
        new MatchesService(fake.client),
        (job, user) =>
          backend.foundation.me.notify(user, `parse:${job.job_id}:completed`, {
            kind: "match",
            title: "Ready",
            body: "Parsed",
            target: { kind: "match", entity_id: job.match_id },
          }),
      );
      assert.equal(
        (
          await service.get(job, a.principal.user_id, {
            deadline_ms: Date.now() + 20000,
            signal: new AbortController().signal,
          })
        ).status,
        "completed",
      );
      await service.get(job, a.principal.user_id, {
        deadline_ms: Date.now() + 20000,
        signal: new AbortController().signal,
      });
      assert.equal(
        backend.foundation.me.notifications(a.principal.user_id).length,
        1,
      );
    },
    { parse: true, overrides: { "/matches/123": detail(123, null) } },
  );
});
test("Already parsed match returns a completed job without re-submitting to upstream", async () => {
  await host(
    async ({ call, backend, fake }) => {
      const a = backend.foundation.sessions.createForVerifiedAccount(
        "1",
        "native",
      );
      const r = await call("/matches/123/parse", post(a.token));
      assert.equal(r.status, 202);
      assert.equal(r.body.data.status, "completed");
      assert.equal(fake.posts.length, 0);
      assert.equal(
        backend.foundation.me.notifications(a.principal.user_id).length,
        1,
      );
    },
    { parse: true },
  );
});
test("Uncertain POST failure stays unknown and cannot trigger an automatic retry", async () => {
  await host(
    async ({ call, backend, fake }) => {
      const a = backend.foundation.sessions.createForVerifiedAccount(
        "1",
        "native",
      );
      fake.setPostError(new UpstreamError("timeout"));
      const r = await call("/matches/123/parse", post(a.token));
      assert.equal(r.status, 504);
      const again = await call("/matches/123/parse", post(a.token));
      assert.equal(again.status, 202);
      assert.equal(again.body.data.status, "unknown");
      assert.equal(fake.posts.length, 1);
      assert.ok(!again.body.data.error.includes("secret"));
    },
    { parse: true, overrides: { "/matches/123": detail(123, null) } },
  );
});
