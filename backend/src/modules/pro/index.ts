import { Router } from "express";
import { z } from "zod";
import type { OpenDotaClient, Team } from "../../../../shared/api-contract.ts";
import {
  ApiError,
  endpoint,
  query,
  numericId,
  pagination,
  text,
  page,
  compareId,
} from "../part2/http.ts";
import { ProService } from "./service.ts";
const empty = z.object({}).strict();
const list = z.object(pagination).strict();
const param = (value: unknown) => numericId.parse(value);
export function createRouter(deps: { client: OpenDotaClient }) {
  const router = Router(),
    service = new ProService(deps.client);
  router.get(
    "/live",
    endpoint(async (req) => {
      query(req, list);
      throw new ApiError(
        501,
        "FEATURE_UNAVAILABLE",
        "Live data source not enabled",
      );
    }),
  );
  router.get(
    "/matches",
    endpoint(async (req, c) =>
      service.matches(
        query(
          req,
          z
            .object({
              ...pagination,
              team_id: numericId.optional(),
              league_id: numericId.optional(),
            })
            .strict(),
        ),
        c,
      ),
    ),
  );
  router.get(
    "/teams",
    endpoint(async (req, c) => {
      const q = query(
        req,
        z
          .object({
            ...pagination,
            q: text().optional(),
            sort: z.enum(["rating", "win_rate", "matches"]).default("rating"),
          })
          .strict(),
      );
      const r = await service.teams(c);
      const term = q.q?.toLowerCase();
      const metric = (t: Team) =>
        q.sort === "rating"
          ? t.rating
          : t.wins == null || t.losses == null
            ? null
            : q.sort === "matches"
              ? t.wins + t.losses
              : t.wins + t.losses
                ? t.wins / (t.wins + t.losses)
                : null;
      const rows = r.data.filter(
        (t) =>
          !term ||
          t.name.toLowerCase().includes(term) ||
          t.tag?.toLowerCase().includes(term),
      );
      rows.sort((a, b) => {
        const x = metric(a),
          y = metric(b);
        return x == null
          ? y == null
            ? compareId(a.team_id, b.team_id)
            : 1
          : y == null
            ? -1
            : y - x || compareId(a.team_id, b.team_id);
      });
      return { ...r, data: page(rows, q.limit, q.offset) };
    }),
  );
  router.get(
    "/teams/:id",
    endpoint(async (req, c) => {
      query(req, empty);
      return service.team(param(req.params.id), c);
    }),
  );
  router.get(
    "/teams/:id/matches",
    endpoint(async (req, c) =>
      service.matches(
        { ...query(req, list), team_id: param(req.params.id) },
        c,
      ),
    ),
  );
  router.get(
    "/teams/:id/players",
    endpoint(async (req, c) => {
      const q = query(req, list),
        r = await service.teamPlayers(param(req.params.id), c);
      r.data.sort((a, b) => compareId(a.account_id, b.account_id));
      return { ...r, data: page(r.data, q.limit, q.offset) };
    }),
  );
  router.get(
    "/players",
    endpoint(async (req, c) => {
      const q = query(
          req,
          z
            .object({
              ...pagination,
              q: text().optional(),
              team_id: numericId.optional(),
            })
            .strict(),
        ),
        r = await service.players(c);
      const term = q.q?.toLowerCase();
      const rows = r.data
        .filter(
          (p) =>
            (!term || p.name?.toLowerCase().includes(term)) &&
            (!q.team_id || p.team_id === q.team_id),
        )
        .sort((a, b) => compareId(a.account_id, b.account_id));
      return { ...r, data: page(rows, q.limit, q.offset) };
    }),
  );
  router.get(
    "/leagues",
    endpoint(async (req, c) => {
      const q = query(
          req,
          z.object({ ...pagination, q: text().optional() }).strict(),
        ),
        r = await service.leagues(c);
      const term = q.q?.toLowerCase();
      const rows = r.data
        .filter((l) => !term || l.name.toLowerCase().includes(term))
        .sort((a, b) => compareId(b.league_id, a.league_id));
      return { ...r, data: page(rows, q.limit, q.offset) };
    }),
  );
  router.get(
    "/leagues/:id",
    endpoint(async (req, c) => {
      query(req, empty);
      return service.league(param(req.params.id), c);
    }),
  );
  router.get(
    "/leagues/:id/matches",
    endpoint(async (req, c) =>
      service.matches(
        { ...query(req, list), league_id: param(req.params.id) },
        c,
      ),
    ),
  );
  router.get(
    "/leagues/:id/teams",
    endpoint(async (req, c) => {
      const q = query(req, list),
        r = await service.leagueTeams(param(req.params.id), c);
      r.data.sort((a, b) => compareId(a.team_id, b.team_id));
      return { ...r, data: page(r.data, q.limit, q.offset) };
    }),
  );
  return router;
}
