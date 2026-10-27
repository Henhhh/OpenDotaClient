import { fileURLToPath } from "node:url";
import { resolve, dirname, basename } from "node:path";
import { rmSync, mkdirSync, cpSync } from "node:fs";
import { spawnSync } from "node:child_process";
const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, "dist");
// Only remove the generated backend/dist directory, never a caller-supplied path.
if (dirname(output) !== resolve(root) || basename(output) !== "dist")
  throw new Error("Invalid build output");
rmSync(output, { recursive: true, force: true });
const result = spawnSync(
  process.execPath,
  [
    resolve(root, "node_modules/typescript/bin/tsc"),
    "-p",
    "tsconfig.build.json",
  ],
  { cwd: root, stdio: "inherit" },
);
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
const migrations = resolve(output, "backend/src/database/migrations");
mkdirSync(migrations, { recursive: true });
cpSync(resolve(root, "src/database/migrations"), migrations, {
  recursive: true,
});
console.log("Backend JavaScript built: dist/backend/src/server.js");
