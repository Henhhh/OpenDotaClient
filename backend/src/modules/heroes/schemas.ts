import { z } from 'zod';
const id = z.number().int().positive().safe();
const count = z.number().int().nonnegative();
const optionalNumber = z.number().finite().nullish();
export const heroSchema = z.object({
  id, name: z.string().regex(/^npc_dota_hero_[a-z0-9_]+$/), localized_name: z.string(),
  primary_attr: z.enum(['str', 'agi', 'int', 'all']), attack_type: z.enum(['Melee', 'Ranged']), roles: z.array(z.string()),
  img: z.string().nullish(), icon: z.string().nullish(),
  base_health: optionalNumber, base_mana: optionalNumber, base_armor: optionalNumber,
  base_str: optionalNumber, base_agi: optionalNumber, base_int: optionalNumber,
  str_gain: optionalNumber, agi_gain: optionalNumber, int_gain: optionalNumber, move_speed: optionalNumber, attack_range: optionalNumber,
  pro_pick: count.optional(), pro_win: count.optional(), pro_ban: count.optional(),
  ...Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`${i + 1}_pick`, count.optional()])),
  ...Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`${i + 1}_win`, count.optional()])),
}).catchall(z.unknown());
export const heroesSchema = z.array(heroSchema);
export const abilitiesSchema = z.record(z.string(), z.object({ dname: z.string().nullish(), desc: z.string().nullish(), img: z.string().nullish() }));
export const heroAbilitiesSchema = z.record(z.string(), z.object({ abilities: z.array(z.union([z.string(), z.array(z.string())])), talents: z.array(z.object({ name: z.string(), level: z.number().int().positive() })) }));
export const itemsSchema = z.record(z.string(), z.object({
  id, dname: z.string().nullish(), img: z.string().nullish(), cost: z.number().nonnegative().nullish(), desc: z.string().nullish(),
  abilities: z.array(z.object({ description: z.string().optional() })).optional(),
}));
export const matchupsSchema = z.array(z.object({ hero_id: id, games_played: count, wins: count }).refine(v => v.wins <= v.games_played));
export const popularitySchema = z.object({
  start_game_items: z.record(z.string().regex(/^[1-9]\d*$/), count),
  early_game_items: z.record(z.string().regex(/^[1-9]\d*$/), count),
  mid_game_items: z.record(z.string().regex(/^[1-9]\d*$/), count),
  late_game_items: z.record(z.string().regex(/^[1-9]\d*$/), count),
});
export const playerSchema = z.object({
  account_id: id.max(4294967295), personaname: z.string().nullish(), avatarfull: z.string().nullish(),
  avatar: z.string().nullish(), loccountrycode: z.string().nullish(), rank_tier: z.number().int().nonnegative().nullish(), leaderboard_rank: z.number().int().positive().nullish(),
});
export const rankingsSchema = z.object({ hero_id: id, rankings: z.array(playerSchema.extend({ score: z.number().finite() })) });
export type UpstreamHero = z.infer<typeof heroSchema>;
