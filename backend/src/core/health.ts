import { Router } from "express";
import type { Health } from "../../../shared/api-contract.ts";
import { endpoint, empty, query } from "./http.ts";
export function createHealthRouter() {
  const router = Router();
  router.get(
    "/health",
    endpoint<Health>(async (req) => {
      query(req, empty);
      return {
        data: { status: "ok", version: "v1" },
        source: "aggregate",
        fetched_at: new Date().toISOString(),
      };
    }),
  );
  return router;
}
