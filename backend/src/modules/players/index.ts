import { Router } from "express";
import { z } from "zod";
import type { OpenDotaClient } from "../../../../shared/api-contract.ts";
import {
  endpoint,
  query,
  accountId,
  numericId,
  empty,
  pagination,
  unixSeconds,
} from "../../core/http.ts";
import { PlayersService } from "./service.ts";
const scope = z.enum(["all_time", "recent"]).default("all_time");
const integer = z
  .string()
  .regex(/^(0|[1-9]\d*)$/)
  .transform(Number)
  .pipe(z.number().int().nonnegative().safe());
export function createRouter(deps: { client: OpenDotaClient }) {
  const router = Router(),
    service = new PlayersService(deps.client);
  router.get(
    "/compare",
    endpoint(async (req, c) => {
      const q = query(
        req,
        z
          .object({
            account_ids: z
              .string()
              .transform((s) => s.split(","))
              .pipe(z.tuple([accountId, accountId]))
              .refine(([a, b]) => a !== b, "Choose two different players"),
            scope,
          })
          .strict(),
      );
      const players = await Promise.all(
        q.account_ids.map(async (id) => {
          const [profile, stats] = await Promise.all([
            service.profile(id, c),
            service.stats(id, q.scope, c),
          ]);
          return {
            profile: profile.data,
            stats: stats.data,
            dates: [profile.fetched_at, stats.fetched_at],
          };
        }),
      );
      return {
        data: {
          players: players.map(({ profile, stats }) => ({ profile, stats })),
        },
        fetched_at: players.flatMap((p) => p.dates).sort()[0],
        source: "aggregate",
      };
    }),
  );
  router.get(
    "/:id",
    endpoint(async (req, c) => {
      query(req, empty);
      return service.profile(accountId.parse(req.params.id), c);
    }),
  );
  router.get(
    "/:id/stats",
    endpoint(async (req, c) => {
      const q = query(req, z.object({ scope }).strict());
      return service.stats(accountId.parse(req.params.id), q.scope, c);
    }),
  );
  router.get(
    "/:id/matches",
    endpoint(async (req, c) => {
      const q = query(
        req,
        z
          .object({
            ...pagination,
            hero_id: numericId.optional(),
            result: z.enum(["win", "loss"]).optional(),
            game_mode: integer.optional(),
            lobby_type: integer.optional(),
            from: unixSeconds.optional(),
            to: unixSeconds.optional(),
          })
          .strict()
          .refine(
            (v) => v.from === undefined || v.to === undefined || v.from < v.to,
            { path: ["to"], message: "from must be less than to" },
          ),
      );
      return service.matches(accountId.parse(req.params.id), q, c);
    }),
  );
  router.get(
    "/:id/heroes",
    endpoint(async (req, c) => {
      const q = query(
        req,
        z
          .object({
            ...pagination,
            sort: z.enum(["games", "win_rate"]).default("games"),
          })
          .strict(),
      );
      return service.heroes(
        accountId.parse(req.params.id),
        q.sort,
        q.limit,
        q.offset,
        c,
      );
    }),
  );
  router.get(
    "/:id/peers",
    endpoint(async (req, c) => {
      const q = query(req, z.object(pagination).strict());
      return service.peers(
        accountId.parse(req.params.id),
        q.limit,
        q.offset,
        c,
      );
    }),
  );
  router.get(
    "/:id/rank-history",
    endpoint(async (req, c) => {
      const q = query(req, z.object(pagination).strict());
      return service.ratings(
        accountId.parse(req.params.id),
        q.limit,
        q.offset,
        c,
      );
    }),
  );
  return router;
}
