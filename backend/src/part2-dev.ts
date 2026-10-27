/** Standalone development host for person 2. Person 1 mounts factories in the main app. */
import express from "express";
import { pathToFileURL } from "node:url";
import type {
  OpenDotaClient,
  TeamSearchService,
} from "../../shared/api-contract.ts";
import { contractClient } from "./integrations/opendota/index.ts";
import { createRouter as heroes } from "./modules/heroes/index.ts";
import { createRouter as constants } from "./modules/constants/index.ts";
import { createRouter as search } from "./modules/search/index.ts";
import { createTeamCatalogSearch } from "./modules/search/team-catalog.ts";
import { errorHandler, ApiError } from "./core/http.ts";
import { requestContext, cors } from "./core/middleware.ts";
export function createPart2App(deps: {
  client: OpenDotaClient;
  teams?: TeamSearchService;
  enableRankings?: boolean;
}) {
  const app = express();
  app.disable("x-powered-by");
  const origins = new Set(
    (
      process.env.DEV_WEB_ORIGINS ??
      "http://localhost:8081,http://127.0.0.1:8081"
    )
      .split(",")
      .map((value) => value.trim()),
  );
  app.use(requestContext(), cors(origins, false, "GET,OPTIONS"));
  app.use("/api/v1/heroes", heroes(deps));
  app.use("/api/v1/constants", constants(deps));
  app.use("/api/v1/search", search(deps));
  app.use((_req, _res, next) =>
    next(new ApiError(404, "NOT_FOUND", "Route not found")),
  );
  app.use(errorHandler);
  return app;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const port = Number(process.env.PORT ?? 3000);
  const client = contractClient();
  const host = process.env.HOST ?? "127.0.0.1";
  createPart2App({
    client,
    teams: createTeamCatalogSearch(client),
    enableRankings: process.env.ENABLE_HERO_RANKINGS === "true",
  }).listen(port, host, () =>
    console.log(`Part 2 API: http://${host}:${port}/api/v1`),
  );
}
