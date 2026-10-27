import type { z } from 'zod';
import type { Hero, HeroDetail, HeroStats, HeroMatchup, Item, ItemPopularity, HeroRanking, OpenDotaClient, PlayerSummary } from '../../../../shared/api-contract.ts';
import { UpstreamError } from '../../integrations/opendota/errors.ts';
import { ApiError, compareId } from '../../core/http.ts';
import type { Context, ServiceResult } from '../../core/http.ts';
import * as schemas from './schemas.ts';

export function image(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('/apps/dota2/')) return `https://cdn.cloudflare.steamstatic.com${path}`;
  try { const url = new URL(path); return url.protocol === 'https:' ? url.href : null; } catch { return null; }
}
export function heroDto(h: schemas.UpstreamHero): Hero {
  return { hero_id: String(h.id), key: h.name.replace('npc_dota_hero_', ''), name: h.localized_name, primary_attr: h.primary_attr, attack_type: h.attack_type, roles: h.roles, image_url: image(h.img), icon_url: image(h.icon) };
}
export function playerDto(p: z.infer<typeof schemas.playerSchema>): PlayerSummary {
  return { account_id: String(p.account_id), name: p.personaname ?? null, avatar_url: image(p.avatarfull ?? p.avatar), country: p.loccountrycode ?? null, rank_tier: p.rank_tier || null, leaderboard_rank: p.leaderboard_rank ?? null };
}
function oldest(...dates: string[]): string { return dates.sort()[0]!; }

export class HeroesService {
  private client: OpenDotaClient;
  constructor(client: OpenDotaClient) { this.client = client; }
  async load<T>(path: string, schema: z.ZodType<T>, context: Context, ttl = 3600, query?: Record<string, string | number | boolean>) {
    return this.client.get(path, query, { validate: raw => schema.parse(raw), ttl_seconds: ttl, cache_namespace: `part2:v1:${path}`, ...context });
  }
  async catalog(context: Context): Promise<ServiceResult<Hero[]>> {
    const result = await this.load('/heroStats', schemas.heroesSchema, context);
    return { data: result.data.map(heroDto), fetched_at: result.fetched_at, source: 'opendota' };
  }
  private async requireHero(id: string, context: Context) {
    const result = await this.load('/heroStats', schemas.heroesSchema, context);
    const hero = result.data.find(h => String(h.id) === id);
    if (!hero) throw new ApiError(404, 'NOT_FOUND', 'Hero not found');
    return { hero, fetched_at: result.fetched_at };
  }
  async detail(id: string, context: Context): Promise<ServiceResult<HeroDetail>> {
    const { hero: h, fetched_at } = await this.requireHero(id, context);
    const [sets, abilities] = await Promise.all([
      this.load('/constants/hero_abilities', schemas.heroAbilitiesSchema, context, 86400),
      this.load('/constants/abilities', schemas.abilitiesSchema, context, 86400),
    ]);
    const set = sets.data[h.name];
    const abilityKeys = set ? [...new Set(set.abilities.flat())].filter(key => key !== 'generic_hidden') : undefined;
    const resolvedAbilities = abilityKeys && abilityKeys.every(key => abilities.data[key]?.dname) ? abilityKeys.map(key => ({ key, name: abilities.data[key]!.dname!, description: abilities.data[key]!.desc ?? null, image_url: image(abilities.data[key]!.img) })) : null;
    const talents = [1, 2, 3, 4].map(level => {
      const names = set?.talents.filter(t => t.level === level).map(t => abilities.data[t.name]?.dname);
      return names?.length === 2 && names.every(Boolean) ? { level: level * 5 + 5, left: names[0]!, right: names[1]! } : null;
    });
    return { data: {
      ...heroDto(h), base_health: h.base_health ?? null, base_mana: h.base_mana ?? null, base_armor: h.base_armor ?? null,
      base_str: h.base_str ?? null, base_agi: h.base_agi ?? null, base_int: h.base_int ?? null,
      str_gain: h.str_gain ?? null, agi_gain: h.agi_gain ?? null, int_gain: h.int_gain ?? null, move_speed: h.move_speed ?? null, attack_range: h.attack_range ?? null,
      abilities: resolvedAbilities ?? null, talents: talents.every(t => t !== null) ? talents : null,
    }, fetched_at: oldest(fetched_at, sets.fetched_at, abilities.fetched_at), source: 'aggregate' };
  }
  async stats(bracket: number | undefined, context: Context): Promise<ServiceResult<HeroStats[]>> {
    const result = await this.load('/heroStats', schemas.heroesSchema, context);
    const data: HeroStats[] = [];
    for (const h of result.data) {
      const picks = bracket ? h[`${bracket}_pick`] : h.pro_pick;
      const wins = bracket ? h[`${bracket}_win`] : h.pro_win;
      if (picks === undefined || wins === undefined) continue;
      if (typeof picks !== 'number' || typeof wins !== 'number' || wins > picks) throw new UpstreamError('invalid_response');
      data.push({ hero_id: String(h.id), bracket: bracket ?? null, picks, wins, bans: bracket ? null : h.pro_ban ?? null, win_rate: picks ? wins / picks : null, pick_rate: null, sample_matches: null });
    }
    return { data, fetched_at: result.fetched_at, source: 'opendota' };
  }
  async matchups(id: string, context: Context): Promise<ServiceResult<HeroMatchup[]>> {
    const hero = await this.requireHero(id, context);
    const result = await this.load(`/heroes/${id}/matchups`, schemas.matchupsSchema, context);
    return { data: result.data.map(row => ({ hero_id: id, against_hero_id: String(row.hero_id), games: row.games_played, wins: row.wins, win_rate: row.games_played ? row.wins / row.games_played : null })), fetched_at: oldest(hero.fetched_at, result.fetched_at), source: 'aggregate' };
  }
  async popularity(id: string, context: Context): Promise<ServiceResult<ItemPopularity>> {
    const hero = await this.requireHero(id, context);
    const result = await this.load(`/heroes/${id}/itemPopularity`, schemas.popularitySchema, context);
    const keys = ['start_game_items', 'early_game_items', 'mid_game_items', 'late_game_items'] as const;
    const phases = ['start', 'early', 'mid', 'late'] as const;
    return { data: { hero_id: id, source_population: 'professional', phases: keys.map((key, i) => ({ phase: phases[i]!, items: Object.entries(result.data[key]).map(([item_id, count]) => ({ item_id, count })).sort((a, b) => b.count - a.count || compareId(a.item_id, b.item_id)) })) }, fetched_at: oldest(hero.fetched_at, result.fetched_at), source: 'aggregate' };
  }
  async items(context: Context): Promise<ServiceResult<Item[]>> {
    const result = await this.load('/constants/items', schemas.itemsSchema, context, 86400);
    return { data: Object.entries(result.data).map(([key, row]) => ({ item_id: String(row.id), key, name: row.dname ?? key, image_url: image(row.img), cost: row.cost ?? null, description: row.desc ?? (row.abilities?.map(a => a.description).filter(Boolean).join('\n') || null) })), fetched_at: result.fetched_at, source: 'constants' };
  }
  async rankings(id: string, context: Context): Promise<ServiceResult<HeroRanking[]>> {
    const hero = await this.requireHero(id, context);
    const result = await this.load('/rankings', schemas.rankingsSchema, context, 3600, { hero_id: id });
    if (String(result.data.hero_id) !== id) throw new UpstreamError('invalid_response');
    const rows = result.data.rankings.sort((a, b) => b.score - a.score || compareId(String(a.account_id), String(b.account_id)));
    return { data: rows.map((row, i) => ({ hero_id: id, player: playerDto(row), score: row.score, position: i + 1 })), fetched_at: oldest(hero.fetched_at, result.fetched_at), source: 'aggregate' };
  }
}
