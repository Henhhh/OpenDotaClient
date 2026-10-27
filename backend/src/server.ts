import { createApp } from "./app.ts";
import { contractClient } from "./integrations/opendota/index.ts";
const production = process.env.NODE_ENV === "production";
const allowedWebOrigins = (
  process.env.WEB_ORIGINS ?? "http://localhost:8081,http://127.0.0.1:8081"
)
  .split(",")
  .filter(Boolean);
const enabled = process.env.ENABLE_ACCOUNT_FEATURES === "true";
const backend = createApp({
  client: contractClient(),
  databasePath: process.env.DATABASE_PATH ?? "./data/opendota.sqlite",
  allowedWebOrigins,
  enableRankings: process.env.ENABLE_HERO_RANKINGS === "true",
  auth: enabled
    ? {
        production,
        publicBaseUrl: process.env.PUBLIC_BASE_URL ?? "http://localhost:3000",
        webOrigins: allowedWebOrigins,
        webRedirects: (
          process.env.AUTH_WEB_REDIRECTS ??
          "http://localhost:8081/auth/callback"
        )
          .split(",")
          .filter(Boolean),
        nativeRedirects: (
          process.env.AUTH_NATIVE_REDIRECTS ?? "opendota://auth/callback"
        )
          .split(",")
          .filter(Boolean),
      }
    : undefined,
});
const host = process.env.HOST ?? "127.0.0.1",
  port = Number(process.env.PORT ?? 3000);
const server = backend.app.listen(port, host, () =>
  console.log(`API: http://${host}:${port}/api/v1`),
);
const cleanup = setInterval(() => {
  try {
    backend.foundation.sessions.pruneExpired();
    backend.foundation.auth?.pruneExpired();
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
