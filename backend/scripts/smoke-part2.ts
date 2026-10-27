/** Explicit network smoke test; never runs in npm test or CI automatically. */
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createPart2App } from '../src/part2-dev.ts';
import { contractClient } from '../src/integrations/opendota/index.ts';
import { createTeamCatalogSearch } from '../src/modules/search/team-catalog.ts';
const client = contractClient();
const server = createPart2App({ client, teams: createTeamCatalogSearch(client), enableRankings: true }).listen(0, '127.0.0.1');
await new Promise<void>(resolve => server.once('listening', resolve));
const port = (server.address() as AddressInfo).port;
try {
  for (const path of ['/heroes?limit=2', '/heroes/1', '/heroes/stats?bracket=7&limit=2', '/heroes/1/matchups?limit=2', '/heroes/1/items', '/heroes/1/rankings?limit=2', '/constants/items?limit=2', '/search?q=antimage&type=hero', '/search?q=miracle&type=player', '/search?q=8312547001&type=match', '/search?q=spirit&type=team', '/search?q=miracle&type=all']) {
    const response = await fetch(`http://127.0.0.1:${port}/api/v1${path}`);
    const body = await response.json();
    assert.equal(response.status, 200, `${path}: ${JSON.stringify(body)}`);
    assert.ok(body.meta.request_id);
    assert.ok(body.meta.fetched_at);
    console.log(`PASS ${path} HTTP ${response.status}`);
  }
} finally {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
