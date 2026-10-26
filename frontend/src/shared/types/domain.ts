export interface ItemPurchase {
  key: string;
  time: number;
}

export interface MatchTeamRef {
  team_id: number;
  name: string;
  tag: string;
}

export interface MatchLeagueRef {
  leagueid: number;
  name: string;
}

export type Attr = "str" | "agi" | "int" | "all";

/** Mirrors the useful subset of GET /heroes + constants. */
export interface HeroBase {
  id: number;
  key: string;
  name: string;
  attr: Attr;
  attack: string;
  roles: string[];
  str: number;
  agi: number;
  int: number;
  strGain: number;
  agiGain: number;
  intGain: number;
  ms: number;
  range: number;
  armor: number;
  hp: number;
  legs: number | null;
}

export interface Ability {
  key: string;
  name: string;
  desc: string;
  behavior: string;
  dmg: string | null;
  cd: string | null;
  mc: string | null;
}

export interface HeroAbilitySet {
  abilities: Ability[];
  ult: Ability;
  talents: string[][];
}

export interface ItemBase {
  key: string;
  name: string;
  cost: number;
  qual: string | null;
  img: string;
  desc: string;
}

export type Position = "carry" | "mid" | "offlane" | "support";

export interface Player {
  account_id: number;
  name: string;
  avatarHero: string;
  rank_tier: number | null;
  leaderboard_rank?: number | null;
  mmr_estimate?: number | null;
  country: string;
  plus?: boolean;
  wins: number;
  losses: number;
  heroPool: number[];
  position: Position;
  pro?: {
    teamId: number;
    role: string;
    realName: string;
  };
}

/** Mirrors GET /players/{id}/matches rows. */
export interface PlayerMatch {
  match_id: number;
  account_id: number;
  player_slot: number;
  radiant_win: boolean;
  hero_id: number;
  kills: number;
  deaths: number;
  assists: number;
  duration: number;
  game_mode: number;
  lobby_type: number;
  start_time: number;
  gold_per_min: number;
  xp_per_min: number;
  last_hits: number;
  hero_damage: number;
  tower_damage: number;
  hero_healing: number;
  level: number;
  net_worth: number;
  lane_role: 1 | 2 | 3 | 4;
  party_size: number;
  parsed: boolean;
}

export interface MatchPlayer {
  player_slot: number;
  isRadiant: boolean;
  account_id: number | null;
  name: string;
  hero_id: number;
  rank_tier: number | null;
  level: number;
  kills: number;
  deaths: number;
  assists: number;
  last_hits: number;
  denies: number;
  gold_per_min: number;
  xp_per_min: number;
  hero_damage: number;
  tower_damage: number;
  hero_healing: number;
  net_worth: number;
  items: (string | null)[];
  backpack: (string | null)[];
  neutral: string | null;
  purchases: ItemPurchase[];
  skillOrder: (number | null)[];
  talentPicks: ("L" | "R")[];
  obs_placed: number;
  sen_placed: number;
  position: Position;
}

export interface PickBan {
  order: number;
  is_pick: boolean;
  hero_id: number;
  team: 0 | 1;
}

export interface Teamfight {
  start: number;
  end: number;
  radiantDeaths: number;
  direDeaths: number;
  goldSwing: number;
  heroes: number[];
}

export interface MatchEvent {
  time: number;
  type:
    | "first_blood"
    | "tower"
    | "barracks"
    | "roshan"
    | "aegis"
    | "courier"
    | "teamfight"
    | "throne";
  team: 0 | 1;
  label: string;
  heroId?: number;
}

export interface MatchDetail {
  match_id: number;
  start_time: number;
  duration: number;
  game_mode: number;
  lobby_type: number;
  radiant_win: boolean;
  radiant_score: number;
  dire_score: number;
  parsed: boolean;
  region: string;
  avg_rank_tier: number | null;
  radiant_team?: MatchTeamRef;
  dire_team?: MatchTeamRef;
  league?: MatchLeagueRef;
  series?: string;
  players: MatchPlayer[];
  picks_bans: PickBan[];
  radiant_gold_adv: number[];
  radiant_xp_adv: number[];
  teamfights: Teamfight[];
  objectives: MatchEvent[];
}

export interface Team {
  team_id: number;
  name: string;
  tag: string;
  rating: number;
  wins: number;
  losses: number;
  color: string;
  color2: string;
  region: string;
  last_match_time: number;
}

export interface League {
  leagueid: number;
  name: string;
  short: string;
  tier: "premium" | "professional" | "amateur";
  prize: string;
  start: number;
  end: number;
  location: string;
  color: string;
  teams: number[];
  status: "live" | "upcoming" | "completed";
}

export interface ProMatch {
  match_id: number;
  leagueid: number;
  radiant_team_id: number;
  dire_team_id: number;
  radiant_win: boolean;
  radiant_score: number;
  dire_score: number;
  duration: number;
  start_time: number;
  series_type: "Bo1" | "Bo3" | "Bo5";
  series_score: [number, number];
  stage: string;
}

export interface LiveMatch {
  id: number;
  leagueid: number;
  radiant_team_id: number;
  dire_team_id: number;
  game_time: number;
  radiant_score: number;
  dire_score: number;
  radiant_lead: number;
  spectators: number;
  game_number: number;
  series_score: [number, number];
  radiant_heroes: number[];
  dire_heroes: number[];
}
