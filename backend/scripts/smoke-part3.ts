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
await new Promise<void>((resolve) => server.once("listening", resolve));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
try {
  for (const path of [
    "/health",
    "/pro/players?limit=2",
    "/pro/leagues?limit=2",
    "/pro/teams/7119388",
    "/pro/teams/7119388/players?limit=2",
    "/pro/matches?limit=1",
    "/pro/teams?limit=2",
  ]) {
    const response = await fetch(base + path, {
      signal: AbortSignal.timeout(25000),
    });
    const body = await response.json();
    assert.equal(
      response.status,
      200,
      `${path}: ${body.error?.code ?? response.status}`,
    );
    assert.ok(body.meta.request_id);
    assert.ok(body.meta.fetched_at);
    if (body.data.items)
      for (const row of body.data.items) {
        for (const key of ["account_id", "team_id", "league_id", "match_id"])
          if (row[key] != null) assert.equal(typeof row[key], "string");
      }
    console.log(`PASS ${path}`);
  }
  assert.equal((await fetch(base + "/pro/live")).status, 501);
  assert.equal((await fetch(base + "/auth/session")).status, 501);
  console.log(
    "PASS disabled live/account gates; Steam sign-in still requires browser verification.",
  );
} finally {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  backend.close();
}
