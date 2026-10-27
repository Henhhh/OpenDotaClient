import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { createApp } from "../src/app.ts";
import { contractClient } from "../src/integrations/opendota/index.ts";
const backend = createApp({
  client: contractClient(),
  databasePath: ":memory:",
  allowedWebOrigins: [],
});
const server = backend.app.listen(0, "127.0.0.1");
await new Promise<void>((r) => server.once("listening", r));
const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
const account = "311360822";
try {
  let matchId: string | undefined;
  for (const path of [
    `/players/${account}`,
    `/players/${account}/stats?scope=recent`,
    `/players/${account}/stats`,
    `/players/${account}/matches?limit=1`,
    `/players/${account}/matches?limit=3`,
    `/players/${account}/matches?limit=20`,
    `/players/${account}/matches?lobby_type=7&limit=20`,
    `/players/${account}/matches?lobby_type=0&limit=20`,
    `/players/${account}/matches?game_mode=23&limit=20`,
    `/players/${account}/heroes?limit=1`,
    `/players/${account}/peers?limit=1`,
    `/players/${account}/rank-history?limit=1`,
  ]) {
    const r = await fetch(url + path, { signal: AbortSignal.timeout(25000) }),
      body = await r.json();
    if (path.includes("rank-history") && r.status === 501) {
      console.log("PASS rank history explicitly unavailable (501)");
      continue;
    }
    assert.equal(r.status, 200, `${path}: ${body.error?.code ?? r.status}`);
    assert.ok(body.meta.fetched_at);
    assert.equal(body.meta.request_id, r.headers.get("x-request-id"));
    if (path.includes("/matches?")) matchId ??= body.data.items[0]?.match_id;
    console.log(`PASS ${path}`);
  }
  if (matchId) {
    const r = await fetch(url + `/matches/${matchId}`, {
        signal: AbortSignal.timeout(25000),
      }),
      body = await r.json();
    assert.equal(r.status, 200, body.error?.code);
    assert.equal(body.data.match_id, matchId);
    for (const p of body.data.players) {
      assert.equal(p.items.length, 6);
      assert.equal(p.backpack.length, 3);
    }
    console.log("PASS match detail and equipment slots from real OpenDota");
  }
  console.log(
    "No parse POST, Steam login or persistent database writes performed.",
  );
} finally {
  await new Promise<void>((resolve, reject) =>
    server.close((e) => (e ? reject(e) : resolve())),
  );
  backend.close();
}
