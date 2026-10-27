import { z } from "zod";
import { numericId, accountId } from "../../core/http.ts";
export const rawId = z.union([
  z.number().int().positive().safe().transform(String),
  numericId,
]);
export const rawAccountId = z.union([
  z.number().int().positive().max(4294967295).transform(String),
  accountId,
]);
export const count = z.number().int().nonnegative().safe();
export const optionalMetric = z.number().finite().nonnegative().nullish();
export const optionalId = z
  .union([count.transform((v) => (v ? String(v) : null)), numericId])
  .nullish();
export const slot = count.refine(
  (v) => v < 5 || (v >= 128 && v < 133),
  "Invalid player slot",
);
export const summarySchema = z.object({
  match_id: rawId,
  start_time: count,
  duration: count,
  game_mode: count,
  lobby_type: count,
  radiant_win: z.boolean().nullish(),
  radiant_score: count.nullish(),
  dire_score: count.nullish(),
  leagueid: optionalId,
  radiant_team_id: optionalId,
  dire_team_id: optionalId,
});
export const playerMatchSchema = summarySchema.extend({
  player_slot: slot,
  // OpenDota history can contain an entry with no hero assigned (numeric 0).
  // The player service excludes these entries before producing positive-ID DTOs.
  hero_id: z.union([rawId, z.literal(0)]),
  kills: count,
  deaths: count,
  assists: count,
  gold_per_min: optionalMetric,
  xp_per_min: optionalMetric,
  lane_role: count.nullish(),
  party_size: count.nullish(),
  version: count.nullish(),
});
export const matchPlayerSchema = z.object({
  player_slot: slot,
  account_id: z
    .union([rawAccountId, z.literal(0).transform(() => null)])
    .nullish(),
  hero_id: rawId,
  personaname: z.string().nullish(),
  name: z.string().nullish(),
  kills: count,
  deaths: count,
  assists: count,
  level: count.nullish(),
  gold_per_min: optionalMetric,
  xp_per_min: optionalMetric,
  last_hits: count.nullish(),
  denies: count.nullish(),
  hero_damage: optionalMetric,
  tower_damage: optionalMetric,
  hero_healing: optionalMetric,
  net_worth: optionalMetric,
  item_0: optionalId,
  item_1: optionalId,
  item_2: optionalId,
  item_3: optionalId,
  item_4: optionalId,
  item_5: optionalId,
  backpack_0: optionalId,
  backpack_1: optionalId,
  backpack_2: optionalId,
  item_neutral: optionalId,
  purchase_log: z
    .array(z.object({ key: z.string(), time: z.number().int().safe() }))
    .nullish(),
  ability_upgrades_arr: z.array(count).nullish(),
});
export const matchSchema = summarySchema
  .extend({
    version: count.nullish(),
    players: z.array(matchPlayerSchema).min(1).max(10),
    picks_bans: z
      .array(
        z.object({
          order: count,
          is_pick: z.boolean(),
          hero_id: rawId,
          team: z.union([z.literal(0), z.literal(1)]),
        }),
      )
      .nullish(),
    radiant_gold_adv: z.array(z.number().finite()).nullish(),
    radiant_xp_adv: z.array(z.number().finite()).nullish(),
  })
  .refine(
    (m) =>
      new Set(m.players.map((p) => p.player_slot)).size === m.players.length,
    "Duplicate player slots",
  );
export type RawSummary = z.infer<typeof summarySchema>;
