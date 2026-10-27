/** API v1 wire DTOs. Source of truth: docs/API_CONTRACT.md. No frontend imports. */
export type Id = string;
export type UnixSeconds = number;
export type Nullable<T> = T | null;
export interface Meta {
  request_id: string;
  fetched_at: string;
  source: 'opendota' | 'constants' | 'database' | 'aggregate';
  stale: boolean;
  unavailable_fields: string[];
}
export interface Success<T> { data: T; meta: Meta }
export interface Page<T> { items: T[]; limit: number; offset: number; has_more: boolean; total: number | null }
export type ErrorCode = 'VALIDATION_ERROR' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'RATE_LIMITED' | 'UPSTREAM_ERROR' | 'UPSTREAM_TIMEOUT' | 'FEATURE_UNAVAILABLE' | 'INTERNAL_ERROR';
export interface Failure { error: { code: ErrorCode; message: string; details: { field: string; message: string }[]; retry_after_seconds: number | null }; request_id: string }
export interface PlayerSummary { account_id: Id; name: string | null; avatar_url: string | null; country: string | null; rank_tier: number | null; leaderboard_rank: number | null }
export interface PlayerProfile extends PlayerSummary { steam_id: Id | null; profile_url: string | null; is_public: boolean | null }
export interface RecordStats { wins: number; losses: number; win_rate: number | null }
export interface PlayerStats extends RecordStats {
  matches: number; avg_kills: number | null; avg_deaths: number | null; avg_assists: number | null;
  kda: number | null; avg_gpm: number | null; avg_xpm: number | null; avg_duration: number | null;
  scope: 'all_time' | 'recent'; sample_size: number;
}
export interface PlayerHero extends RecordStats { hero_id: Id; games: number; last_played: UnixSeconds | null }
export interface Peer extends PlayerSummary, RecordStats { games: number; last_played: UnixSeconds | null }
export interface RankPoint { time: UnixSeconds; rank_tier: number | null; mmr: number | null }
export interface PlayerComparison { players: { profile: PlayerProfile; stats: PlayerStats }[] }
export interface MatchSummary {
  match_id: Id; start_time: UnixSeconds; duration: number; game_mode: number; lobby_type: number;
  radiant_win: boolean | null; radiant_score: number | null; dire_score: number | null;
  league_id: Id | null; radiant_team_id: Id | null; dire_team_id: Id | null;
}
export interface PlayerMatch extends MatchSummary {
  account_id: Id; player_slot: number; hero_id: Id; won: boolean | null;
  kills: number; deaths: number; assists: number; gold_per_min: number | null; xp_per_min: number | null;
  lane_role: number | null; party_size: number | null; parsed: boolean | null;
}
export interface Purchase { item_id: Id; time: number }
export interface MatchPlayer {
  account_id: Id | null; player_slot: number; hero_id: Id; name: string | null;
  kills: number; deaths: number; assists: number; level: number | null;
  gold_per_min: number | null; xp_per_min: number | null; last_hits: number | null;
  denies: number | null; hero_damage: number | null; tower_damage: number | null;
  hero_healing: number | null; net_worth: number | null;
  items: (Id | null)[]; backpack: (Id | null)[]; neutral_item: Id | null;
  purchases: Purchase[] | null; ability_upgrades: Id[] | null;
}
export interface PickBan { order: number; is_pick: boolean; hero_id: Id; team: 0 | 1 }
export interface MatchDetail extends MatchSummary {
  parsed: boolean; players: MatchPlayer[]; picks_bans: PickBan[] | null;
  radiant_gold_adv: number[] | null; radiant_xp_adv: number[] | null;
}
export interface ParseJob { job_id: Id; match_id: Id; status: 'queued' | 'processing' | 'completed' | 'failed' | 'unknown'; error: string | null; poll_after_seconds: number }
export interface Ability { key: string; name: string; description: string | null; image_url: string | null }
export interface Hero {
  hero_id: Id; key: string; name: string; primary_attr: 'str' | 'agi' | 'int' | 'all';
  attack_type: 'Melee' | 'Ranged'; roles: string[]; image_url: string | null; icon_url: string | null;
}
export interface HeroDetail extends Hero {
  base_health: number | null; base_mana: number | null; base_armor: number | null;
  base_str: number | null; base_agi: number | null; base_int: number | null;
  str_gain: number | null; agi_gain: number | null; int_gain: number | null;
  move_speed: number | null; attack_range: number | null;
  abilities: Ability[] | null; talents: { level: number; left: string; right: string }[] | null;
}
export interface HeroStats {
  hero_id: Id; bracket: number | null; picks: number; wins: number; bans: number | null;
  win_rate: number | null; pick_rate: number | null; sample_matches: number | null;
}
export interface HeroMatchup { hero_id: Id; against_hero_id: Id; games: number; wins: number; win_rate: number | null }
export interface Item { item_id: Id; key: string; name: string; image_url: string | null; cost: number | null; description: string | null }
export interface ItemPopularity { hero_id: Id; source_population: 'professional'; phases: { phase: 'start' | 'early' | 'mid' | 'late'; items: { item_id: Id; count: number }[] }[] }
export interface HeroRanking { hero_id: Id; player: PlayerSummary; score: number; position: number }
export interface SearchResults { players: PlayerSummary[]; heroes: Hero[]; teams: Team[]; match: { match_id: Id; verified: false } | null }
export interface Team { team_id: Id; name: string; tag: string | null; logo_url: string | null; rating: number | null; wins: number | null; losses: number | null; region: string | null; last_match_time: UnixSeconds | null }
export interface ProPlayer extends PlayerSummary { team_id: Id | null; team_name: string | null; real_name: string | null; role: string | null }
export interface League { league_id: Id; name: string; tier: string | null; start_time: UnixSeconds | null; end_time: UnixSeconds | null; prize_usd: number | null; status: 'live' | 'upcoming' | 'completed' | null }
export interface LiveMatch { live_id: Id; match_id: Id | null; league_id: Id | null; radiant_team_id: Id | null; dire_team_id: Id | null; game_time: number | null; radiant_score: number | null; dire_score: number | null; spectators: number | null }
export interface AppUser { user_id: Id; email: string | null; name: string; dota_account_id: Id | null }
export interface Session { user: AppUser; expires_at: string }
export interface LoginRequest { email: string; password: string; platform: 'web' | 'native' }
export interface RegisterRequest extends LoginRequest { name: string }
export type FavoriteKind = 'hero' | 'player' | 'team';
export interface Favorite { kind: FavoriteKind; entity_id: Id; created_at: string }
export interface Settings { theme: 'dark' | 'light' | 'system'; language: 'vi' | 'en'; in_app_notifications: boolean }
export interface Notification { notification_id: Id; kind: 'match' | 'favorite' | 'system'; title: string; body: string; created_at: string; read_at: string | null; target: { kind: 'match' | 'player' | 'hero' | 'team' | 'league'; entity_id: Id } | null }
export interface ReadResult { updated: number }
export interface Health { status: 'ok'; version: 'v1' }

/** Internal integration contracts; never serialize these as API response DTOs. */
export type UpstreamQuery = Record<string, string | number | boolean>;
export interface UpstreamResult<T> { data: T; fetched_at: string }
export interface UpstreamPostOptions<T> {
  validate: (raw: unknown) => T;
  deadline_ms: number;
  signal?: AbortSignal;
}
export interface UpstreamGetOptions<T> extends UpstreamPostOptions<T> {
  ttl_seconds: number;
  cache_namespace: string;
}
export interface OpenDotaClient {
  get<T>(path: string, query: UpstreamQuery | undefined, options: UpstreamGetOptions<T>): Promise<UpstreamResult<T>>;
  post<T>(path: string, body: Record<string, unknown> | undefined, options: UpstreamPostOptions<T>): Promise<UpstreamResult<T>>;
}
export type UpstreamErrorKind = 'not_found' | 'rate_limited' | 'timeout' | 'unavailable' | 'invalid_response';
export interface UpstreamError extends Error {
  kind: UpstreamErrorKind;
  retry_after_seconds: number | null;
  status: number | null;
}
export interface TeamSearchService {
  search(q: string, limit: number, options: { deadline_ms: number; signal?: AbortSignal }): Promise<UpstreamResult<Team[]>>;
}
export interface SessionPrincipal { user_id: string; account_id: Id | null }
export interface ParseJobStore {
  /** Atomic: reuse an active job by match and grant this user access, or reserve one. */
  reserve(match_id: Id, user_id: string): Promise<{ job: ParseJob; created: boolean }>;
  getForUser(job_id: Id, user_id: string): Promise<ParseJob | null>;
  /** Internal service only; never exposed directly to request bodies. */
  update(job_id: Id, patch: Pick<ParseJob, 'status' | 'error' | 'poll_after_seconds'>): Promise<ParseJob>;
  /** Persist upstream opaque job ID separately from the public job ID. */
  setUpstreamJobId(job_id: Id, upstream_job_id: string): Promise<void>;
  getUpstreamJobId(job_id: Id): Promise<string | null>;
}
export interface NativeSession { session: Session; access_token: string }
export type SettingsPatch = Partial<Settings>;
