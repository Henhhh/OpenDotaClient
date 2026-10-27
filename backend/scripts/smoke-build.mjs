import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
const root = fileURLToPath(new URL("../", import.meta.url));
const entry = new URL("../dist/backend/src/server.js", import.meta.url);
assert.ok(existsSync(entry), "Run npm run build first");
assert.ok(
  existsSync(new URL("../dist/shared/api-contract.js", import.meta.url)),
  "Shared DTO output missing",
);
assert.ok(
  existsSync(
    new URL(
      "../dist/backend/src/database/migrations/002-auth.sql",
      import.meta.url,
    ),
  ),
  "SQL migration output missing",
);
const child = fork(fileURLToPath(entry), [], {
  cwd: root,
  env: {
    ...process.env,
    PORT: "0",
    HOST: "127.0.0.1",
    DATABASE_PATH: ":memory:",
    ENABLE_ACCOUNT_FEATURES: "false",
    ENABLE_HERO_RANKINGS: "false",
  },
  execArgv: [],
  silent: true,
});
try {
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Compiled API did not start within 10 seconds")),
      10000,
    );
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Compiled API exited before startup (${code})`));
    });
    child.on("message", (message) => {
      if (message?.type === "ready") {
        clearTimeout(timer);
        resolve(message.port);
      }
    });
  });
  const r = await fetch(`http://127.0.0.1:${port}/api/v1/health`, {
    signal: AbortSignal.timeout(5000),
  });
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.deepEqual(body.data, { status: "ok", version: "v1" });
  assert.equal(body.meta.request_id, r.headers.get("x-request-id"));
  console.log(
    "PASS compiled JavaScript server + shared DTO output + SQLite migrations + /api/v1/health",
  );
} finally {
  if (child.pid && child.exitCode === null && child.signalCode === null) {
    const exited = new Promise((resolve) => child.once("exit", resolve));
    child.kill();
    await exited;
  }
}
