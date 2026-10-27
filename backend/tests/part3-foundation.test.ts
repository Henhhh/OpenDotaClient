import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import type { AddressInfo } from 'node:net';
import { openDatabase, migrate } from '../src/database/index.ts';
import { createSessionStore } from '../src/database/session-store.ts';
import { createParseJobStore } from '../src/database/parse-job-store.ts';
import { requireSession, sessionPrincipal, SESSION_COOKIE } from '../src/modules/auth/session.ts';
import { errorHandler } from '../src/modules/part2/http.ts';
import { createTeamCatalogSearch } from '../src/modules/pro/team-search.ts';
import type { OpenDotaClient } from '../../shared/api-contract.ts';
import { createPart3Foundation } from '../src/part3-foundation.ts';

test('migration is repeatable, persists sessions and enables foreign keys', () => {
  const dir = mkdtempSync(join(tmpdir(), 'opendota-part3-'));
  let db = openDatabase(join(dir, 'test.sqlite'));
  try {
    const store = createSessionStore(db);
    const session = store.createForVerifiedAccount('1','web');
    migrate(db);
    assert.equal(db.prepare('SELECT count(*) AS n FROM schema_migrations').get()!.n, 3);
    assert.equal(db.prepare('PRAGMA foreign_keys').get()!.foreign_keys, 1);
    assert.deepEqual({ ...db.prepare('SELECT theme,language,in_app_notifications FROM settings').get() }, { theme: 'dark', language: 'en', in_app_notifications: 1 });
    assert.notEqual(db.prepare('SELECT token_hash FROM sessions').get()!.token_hash, session.token);
    db.close(); db = openDatabase(join(dir, 'test.sqlite'));
    assert.equal(createSessionStore(db).resolve(session.token)!.principal.account_id, '1');
    db.prepare("UPDATE schema_migrations SET checksum='tampered'").run();
    assert.throws(() => migrate(db), /checksum/);
  } finally { db.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('sessions validate identity, expire exactly at deadline and revoke independently', () => {
  const db = openDatabase(':memory:'); let now = 1000000;
  try {
    const store = createSessionStore(db, () => now);
    for (const id of ['0','01','4294967296','1e2']) assert.throws(() => store.createForVerifiedAccount(id,'web'));
    const a = store.createForVerifiedAccount('1','web');
    const b = store.createForVerifiedAccount('1','native');
    assert.equal(a.principal.user_id, b.principal.user_id);
    assert.equal(store.resolve('forged'), null);
    store.revoke(a.token); assert.equal(store.resolve(a.token), null);
    assert.ok(store.resolve(b.token));
    now += 7 * 86400000;
    assert.equal(store.resolve(b.token), null);
    assert.equal(store.pruneExpired(), 1);
  } finally { db.close(); }
});

test('two database connections reserve only one active job and persist grants across reopen', async () => {
  const dir = mkdtempSync(join(tmpdir(),'opendota-reservation-'));
  const filename = join(dir,'test.sqlite');
  const a = openDatabase(filename); const b = openDatabase(filename);
  try {
    const owner = createSessionStore(a).createForVerifiedAccount('3','native').principal.user_id;
    const results = await Promise.all([createParseJobStore(a).reserve('123',owner),createParseJobStore(b).reserve('123',owner)]);
    assert.equal(results.filter(r=>r.created).length,1);
    assert.equal(results[0].job.job_id,results[1].job.job_id);
    const c = openDatabase(filename);
    try { assert.ok(await createParseJobStore(c).getForUser(results[0].job.job_id,owner)); }
    finally { c.close(); }
  } finally { a.close(); b.close(); rmSync(dir,{recursive:true,force:true}); }
});

test('parse reservations are shared atomically, access isolated, unknown retained, terminal jobs replaced', async () => {
  const db = openDatabase(':memory:');
  try {
    const sessions = createSessionStore(db);
    const a = sessions.createForVerifiedAccount('1','native').principal.user_id;
    const b = sessions.createForVerifiedAccount('2','native').principal.user_id;
    const store = createParseJobStore(db);
    const [first, same] = await Promise.all([store.reserve('123',a),store.reserve('123',a)]);
    assert.equal(first.created, true); assert.equal(same.created, false);
    assert.equal(first.job.job_id, same.job.job_id);
    assert.equal(await store.getForUser(first.job.job_id,b), null);
    assert.equal((await store.reserve('123',b)).job.job_id, first.job.job_id);
    assert.ok(await store.getForUser(first.job.job_id,b));
    await store.setUpstreamJobId(first.job.job_id,'upstream-job');
    assert.equal(await store.getUpstreamJobId(first.job.job_id), 'upstream-job');
    assert.equal(Object.hasOwn((await store.getForUser(first.job.job_id,a))!, 'upstream_job_id'), false);
    await assert.rejects(store.setUpstreamJobId(first.job.job_id,'different'));
    await store.update(first.job.job_id,{status:'unknown',error:null,poll_after_seconds:5});
    assert.equal((await store.reserve('123',a)).created,false);
    await store.update(first.job.job_id,{status:'completed',error:null,poll_after_seconds:5});
    await assert.rejects(store.update(first.job.job_id,{status:'processing',error:null,poll_after_seconds:5}));
    assert.equal((await store.reserve('123',a)).created,true);
    await assert.rejects(store.reserve('999','missing-user'));
    assert.equal(db.prepare("SELECT count(*) AS n FROM parse_jobs WHERE match_id='999'").get()!.n,0);
  } finally { db.close(); }
});

test('cookie/Bearer middleware rejects forgery, CSRF, mixed credentials and wrong transport', async () => {
  const db = openDatabase(':memory:');
  const store = createSessionStore(db);
  const web = store.createForVerifiedAccount('1','web');
  const native = store.createForVerifiedAccount('2','native');
  const app = express();
  app.use(requireSession(store,new Set(['http://localhost:8081'])));
  app.all('/private',(_req,res) => res.json(sessionPrincipal(res)));
  app.use(errorHandler);
  const server = app.listen(0,'127.0.0.1');
  await new Promise<void>(resolve => server.once('listening',resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/private`;
  const cookie = `${SESSION_COOKIE}=${web.token}`;
  try {
    assert.equal((await fetch(url)).status,401);
    assert.equal((await fetch(url,{headers:{cookie}})).status,200);
    assert.equal((await fetch(url,{headers:{authorization:`Bearer ${native.token}`}})).status,200);
    assert.equal((await fetch(url,{headers:{authorization:`Bearer ${web.token}`}})).status,401);
    assert.equal((await fetch(url,{headers:{cookie,authorization:`Bearer ${native.token}`}})).status,401);
    assert.equal((await fetch(url,{headers:{cookie:`${cookie}; ${cookie}`}})).status,401);
    for (const origin of [undefined,'https://evil.example']) {
      const headers: Record<string,string> = {cookie,'content-type':'application/json'};
      if(origin) headers.origin=origin;
      assert.equal((await fetch(url,{method:'POST',headers,body:'{}'})).status,403);
    }
    const ok = await fetch(url,{method:'POST',headers:{cookie,origin:'http://localhost:8081','content-type':'application/json'},body:'{"user_id":"forged"}'});
    assert.equal(ok.status,200);
    assert.equal((await ok.json() as {user_id:string}).user_id,web.principal.user_id);
    assert.equal((await fetch(url,{method:'POST',headers:{cookie,origin:'http://localhost:8081'},body:'text'})).status,400);
    store.revoke(web.token);
    assert.equal((await fetch(url,{headers:{cookie}})).status,401);
  } finally { await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve())); db.close(); }
});

test('team search scans all upstream pages before filtering; preserves nulls and oldest freshness', async () => {
  const pages: number[] = [];
  const client: OpenDotaClient = {
    async get(_path,query,options) {
      const page = Number(query?.page); pages.push(page);
      const rows = page === 0 ? Array.from({length:1000},(_,i)=>({team_id:i+1,name:`Team ${i}`})) : [{team_id:1001,name:'Last Spirit',logo_url:'http://insecure.example/logo'}];
      return { data: options.validate(rows), fetched_at: page === 0 ? '2026-10-26T00:00:00Z' : '2026-10-27T00:00:00Z' };
    },
    async post(){throw new Error('Unexpected POST');},
  };
  const result = await createTeamCatalogSearch(client).search('spirit',5,{deadline_ms:Date.now()+20000});
  assert.deepEqual(pages,[0,1]);
  assert.equal(result.data[0].team_id,'1001');
  assert.equal(result.data[0].logo_url,null);
  assert.equal(result.data[0].region,null);
  assert.equal(result.fetched_at,'2026-10-26T00:00:00Z');
});

test('team service refuses repeated full pages, expired deadline and cancellation', async () => {
  const client: OpenDotaClient = {
    async get(_p,_q,o){return {data:o.validate(Array.from({length:1000},(_,i)=>({team_id:i+1,name:'Team'}))),fetched_at:new Date().toISOString()};},
    async post(){throw new Error('Unexpected POST');},
  };
  const service = createTeamCatalogSearch(client);
  await assert.rejects(service.search('team',5,{deadline_ms:Date.now()+20000}),{kind:'invalid_response'});
  await assert.rejects(service.search('team',5,{deadline_ms:0}),{kind:'timeout'});
  await assert.rejects(service.search('team',5,{deadline_ms:Date.now()+20000,signal:AbortSignal.abort()}));
});

test('composition factory reuses injected client and validates origins without starting a server', async () => {
  let calls = 0;
  const client: OpenDotaClient = {
    async get(_p,_q,o){calls++;return {data:o.validate([]),fetched_at:new Date().toISOString()};},
    async post(){throw new Error('Unexpected POST');},
  };
  const foundation = createPart3Foundation({client,databasePath:':memory:',allowedWebOrigins:['http://localhost:8081']});
  try {
    assert.deepEqual((await foundation.teams.search('team',5,{deadline_ms:Date.now()+20000})).data,[]);
    assert.equal(calls,1);
    assert.equal(typeof foundation.requireSession,'function');
  } finally { foundation.close(); }
  for (const origin of ['*','https://example.com/path','https://example.com/']) {
    assert.throws(()=>createPart3Foundation({client,databasePath:':memory:',allowedWebOrigins:[origin]}));
  }
});
