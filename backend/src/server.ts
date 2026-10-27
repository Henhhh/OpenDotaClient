import { createApp } from "./app.ts";
import { contractClient } from "./integrations/opendota/index.ts";
import { loadConfig } from "./core/config.ts";
const config = loadConfig();
const backend = createApp({
  ...config,
  client: contractClient(),
});
const server = backend.app.listen(config.port, config.host, () => {
  const address = server.address();
  const port =
    address && typeof address === "object" ? address.port : config.port;
  console.log(`API listening on port ${port}`);
  if (process.send) process.send({ type: "ready", port });
});
server.headersTimeout = 30000;
server.requestTimeout = 30000;
server.on("error", () => {
  clearInterval(cleanup);
  backend.close();
  console.error("Unable to start API listener");
  process.exitCode = 1;
});
const cleanup = setInterval(() => {
  try {
    backend.foundation.sessions.pruneExpired();
  } catch {
    console.error("Expired account data cleanup failed");
  }
}, 60000);
cleanup.unref();
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.once(signal, () => {
    clearInterval(cleanup);
    server.close(() => backend.close());
  });
