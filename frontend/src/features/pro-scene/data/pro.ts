import type { League, LiveMatch, ProMatch, Team } from "@/shared/types/domain";
import { NOW } from "@/shared/utils/format";
import { Rng } from "@/shared/utils/rng";
import { HEROES, primaryPosition } from "@/features/heroes/data/heroes";

const DAY = 86400;

const year = (t: number) => new Date(t * 1000).getFullYear();

export const TEAMS: Team[] = [
  {
    team_id: 7119388,
    name: "Team Spirit",
    tag: "TSpirit",
    rating: 1642,
    wins: 512,
    losses: 281,
    color: "#f2f2f2",
    color2: "#2b2d33",
    region: "Eastern Europe",
    last_match_time: NOW - 3 * 3600,
  },
  {
    team_id: 2163,
    name: "Team Liquid",
    tag: "Liquid",
    rating: 1618,
    wins: 1104,
    losses: 742,
    color: "#2a6fdb",
    color2: "#0e1c3a",
    region: "Western Europe",
    last_match_time: NOW - 5 * 3600,
  },
  {
    team_id: 8599101,
    name: "Gaimin Gladiators",
    tag: "GG",
    rating: 1597,
    wins: 402,
    losses: 219,
    color: "#f5c04a",
    color2: "#2d220a",
    region: "Western Europe",
    last_match_time: NOW - 9 * 3600,
  },
  {
    team_id: 8291895,
    name: "Tundra Esports",
    tag: "Tundra",
    rating: 1571,
    wins: 388,
    losses: 254,
    color: "#21c58f",
    color2: "#082a20",
    region: "Western Europe",
    last_match_time: NOW - 20 * 3600,
  },
  {
    team_id: 8255888,
    name: "BetBoom Team",
    tag: "BB",
    rating: 1566,
    wins: 344,
    losses: 236,
    color: "#e8e8e8",
    color2: "#5b1720",
    region: "Eastern Europe",
    last_match_time: NOW - 26 * 3600,
  },
  {
    team_id: 9247354,
    name: "Team Falcons",
    tag: "Falcons",
    rating: 1559,
    wins: 251,
    losses: 140,
    color: "#3fd17a",
    color2: "#0b2617",
    region: "MENA",
    last_match_time: NOW - 2 * DAY,
  },
  {
    team_id: 8261500,
    name: "Xtreme Gaming",
    tag: "XG",
    rating: 1538,
    wins: 297,
    losses: 211,
    color: "#ff4d4d",
    color2: "#2c0b0b",
    region: "China",
    last_match_time: NOW - 2 * DAY,
  },
  {
    team_id: 9467224,
    name: "Aurora Gaming",
    tag: "Aurora",
    rating: 1512,
    wins: 188,
    losses: 161,
    color: "#b38cff",
    color2: "#1d1236",
    region: "SEA",
    last_match_time: NOW - 3 * DAY,
  },
];

export const getTeam = (id: number) =>
  TEAMS.find((t) => t.team_id === id) ?? TEAMS[0];

export interface ProRosterEntry {
  account_id: number;
  name: string;
  realName: string;
  teamId: number;
  role: "Carry" | "Mid" | "Offlane" | "Soft Support" | "Hard Support";
  country: string;
  signature: number[];
}

const R = (
  account_id: number,
  name: string,
  realName: string,
  teamId: number,
  role: ProRosterEntry["role"],
  country: string,
  signature: number[],
): ProRosterEntry => ({
  account_id,
  name,
  realName,
  teamId,
  role,
  country,
  signature,
});

export const PRO_ROSTER: ProRosterEntry[] = [
  R(
    311360822,
    "Yatoro",
    "Illya Mulyarchuk",
    7119388,
    "Carry",
    "UA",
    [1, 109, 93, 89],
  ),
  R(
    321580662,
    "Larl",
    "Denis Sigitov",
    7119388,
    "Mid",
    "RU",
    [17, 39, 126, 13],
  ),
  R(
    113331514,
    "Collapse",
    "Magomed Khalilov",
    7119388,
    "Offlane",
    "RU",
    [129, 137, 16, 97],
  ),
  R(
    256156323,
    "rue",
    "Miroslav Bičan",
    7119388,
    "Soft Support",
    "RU",
    [100, 26, 71, 14],
  ),
  R(
    105248644,
    "Miposhka",
    "Yaroslav Naidenov",
    7119388,
    "Hard Support",
    "RU",
    [5, 50, 102, 3],
  ),
  R(152962063, "miCKe", "Michael Vu", 2163, "Carry", "SE", [1, 8, 12, 94]),
  R(
    201358612,
    "Nisha",
    "Michał Jankowski",
    2163,
    "Mid",
    "PL",
    [17, 46, 13, 74],
  ),
  R(
    73562326,
    "Zai",
    "Ludwig Wåhlberg",
    2163,
    "Offlane",
    "SE",
    [2, 104, 96, 98],
  ),
  R(
    77490514,
    "Boxi",
    "Samuel Svahn",
    2163,
    "Soft Support",
    "SE",
    [86, 71, 107, 110],
  ),
  R(
    54580962,
    "Insania",
    "Aydin Sarkohi",
    2163,
    "Hard Support",
    "SE",
    [31, 3, 64, 20],
  ),
  R(
    56351509,
    "dyrachyo",
    "Anton Shkredov",
    8599101,
    "Carry",
    "RU",
    [44, 70, 6, 67],
  ),
  R(
    221666230,
    "Quinn",
    "Quinn Callahan",
    8599101,
    "Mid",
    "US",
    [11, 25, 22, 49],
  ),
  R(
    97590558,
    "Ace",
    "Marcus Hoelgaard",
    8599101,
    "Offlane",
    "DK",
    [29, 99, 108, 7],
  ),
  R(
    16497807,
    "tOfu",
    "Erik Engel",
    8599101,
    "Soft Support",
    "DE",
    [87, 128, 119, 75],
  ),
  R(
    91730177,
    "Seleri",
    "Melchior Hillenkamp",
    8599101,
    "Hard Support",
    "DE",
    [26, 30, 111, 57],
  ),
  R(
    206642367,
    "Pure",
    "Ivan Moskalenko",
    8291895,
    "Carry",
    "RU",
    [109, 10, 81, 41],
  ),
  R(
    148215639,
    "bzm",
    "Bozhidar Bogdanov",
    8291895,
    "Mid",
    "BG",
    [39, 106, 76, 23],
  ),
  R(
    86698277,
    "33",
    "Neta Shapira",
    8291895,
    "Offlane",
    "IL",
    [53, 104, 33, 92],
  ),
  R(
    103735745,
    "Saksa",
    "Martin Sazdov",
    8291895,
    "Soft Support",
    "MK",
    [7, 51, 100, 9],
  ),
  R(
    129958758,
    "Whitemon",
    "Matthew Filemon",
    8291895,
    "Hard Support",
    "ID",
    [5, 37, 121, 85],
  ),
  R(
    116249155,
    "Kiyotaka",
    "Danil Skutin",
    8255888,
    "Carry",
    "RU",
    [8, 48, 81, 94],
  ),
  R(
    480412663,
    "gpk~",
    "Danil Lazebny",
    8255888,
    "Mid",
    "RU",
    [17, 74, 34, 126],
  ),
  R(
    101356886,
    "MieRo`",
    "Nikita Anisimov",
    8255888,
    "Offlane",
    "RU",
    [69, 96, 137, 2],
  ),
  R(
    126212866,
    "Save-",
    "Vladimir Minenko",
    8255888,
    "Soft Support",
    "MD",
    [14, 71, 128, 100],
  ),
  R(
    140153524,
    "TORONTOTOKYO",
    "Alexander Khertek",
    8255888,
    "Hard Support",
    "RU",
    [3, 26, 50, 84],
  ),
  R(
    183719386,
    "skiter",
    "Oliver Lepko",
    9247354,
    "Carry",
    "SK",
    [67, 109, 1, 93],
  ),
  R(
    392565237,
    "Malr1ne",
    "Stanislav Potorak",
    9247354,
    "Mid",
    "RU",
    [126, 13, 39, 17],
  ),
  R(
    183378746,
    "ATF",
    "Ammar Al-Assaf",
    9247354,
    "Offlane",
    "JO",
    [129, 99, 2, 16],
  ),
  R(
    25907144,
    "Cr1t-",
    "Andreas Nielsen",
    9247354,
    "Soft Support",
    "DK",
    [107, 86, 100, 51],
  ),
  R(
    10366616,
    "Sneyking",
    "Jingjun Wu",
    9247354,
    "Hard Support",
    "US",
    [3, 20, 102, 31],
  ),
  R(898754153, "Ame", "Wang Chunyu", 8261500, "Carry", "CN", [1, 10, 89, 12]),
  R(157475523, "Xm", "Guo Hongcheng", 8261500, "Mid", "CN", [74, 11, 49, 22]),
  R(137193239, "Xxs", "Lin Jing", 8261500, "Offlane", "CN", [96, 69, 33, 108]),
  R(
    159020918,
    "XinQ",
    "Zhao Zixing",
    8261500,
    "Soft Support",
    "CN",
    [71, 110, 14, 26],
  ),
  R(
    118134220,
    "Dy",
    "Ding Cong",
    8261500,
    "Hard Support",
    "CN",
    [5, 50, 64, 37],
  ),
  R(
    124801257,
    "Nightfall",
    "Egor Grigorenko",
    9467224,
    "Carry",
    "RU",
    [48, 8, 54, 70],
  ),
  R(
    1019770875,
    "23savage",
    "Nuengnara Teeramahanon",
    9467224,
    "Mid",
    "TH",
    [46, 35, 11, 39],
  ),
  R(
    194979527,
    "Mira",
    "Mira Kaishev",
    9467224,
    "Offlane",
    "UA",
    [2, 96, 97, 129],
  ),
  R(
    302214028,
    "Panda",
    "Thitipong Pandaros",
    9467224,
    "Soft Support",
    "TH",
    [100, 107, 86, 14],
  ),
  R(
    164532005,
    "Kimo",
    "Kim Paolo",
    9467224,
    "Hard Support",
    "PH",
    [3, 30, 84, 111],
  ),
];

export const proByTeam = (teamId: number) =>
  PRO_ROSTER.filter((p) => p.teamId === teamId);

export const getPro = (id: number) =>
  PRO_ROSTER.find((p) => p.account_id === id);

/* ---------------- Leagues ---------------- */

export const LEAGUES: League[] = [
  {
    leagueid: 17420,
    name: "DreamLeague Season 28",
    short: "DL28",
    tier: "premium",
    prize: "$1,000,000",
    start: NOW - 5 * DAY,
    end: NOW + 9 * DAY,
    location: "Online · Europe",
    color: "#7b5cff",
    teams: TEAMS.map((t) => t.team_id),
    status: "live",
  },
  {
    leagueid: 17510,
    name: "PGL Wallachia Season 7",
    short: "PGL",
    tier: "premium",
    prize: "$1,000,000",
    start: NOW + 18 * DAY,
    end: NOW + 27 * DAY,
    location: "Bucharest, Romania",
    color: "#e0a43a",
    teams: [7119388, 2163, 8599101, 8291895, 9247354, 8261500],
    status: "upcoming",
  },
  {
    leagueid: 16935,
    name: `The International ${year(NOW - 60 * DAY)}`,
    short: "TI",
    tier: "premium",
    prize: "$2,876,000",
    start: NOW - 70 * DAY,
    end: NOW - 54 * DAY,
    location: "Hamburg, Germany",
    color: "#3aa0d6",
    teams: TEAMS.map((t) => t.team_id),
    status: "completed",
  },
  {
    leagueid: 16881,
    name: `Esports World Cup ${year(NOW - 100 * DAY)}`,
    short: "EWC",
    tier: "premium",
    prize: "$5,000,000",
    start: NOW - 110 * DAY,
    end: NOW - 98 * DAY,
    location: "Riyadh, Saudi Arabia",
    color: "#3fd17a",
    teams: [7119388, 2163, 8599101, 8291895, 8255888, 9247354, 8261500],
    status: "completed",
  },
  {
    leagueid: 17101,
    name: "FISSURE Universe Episode 8",
    short: "FU8",
    tier: "professional",
    prize: "$250,000",
    start: NOW - 34 * DAY,
    end: NOW - 26 * DAY,
    location: "Belgrade, Serbia",
    color: "#e85a5a",
    teams: [8255888, 9467224, 8261500, 8291895, 9247354],
    status: "completed",
  },
  {
    leagueid: 17602,
    name: "European Pro League S34",
    short: "EPL",
    tier: "professional",
    prize: "$45,000",
    start: NOW - 12 * DAY,
    end: NOW + 14 * DAY,
    location: "Online · Europe",
    color: "var(--od-gold)",
    teams: [8255888, 9467224, 8291895, 2163],
    status: "live",
  },
];

export const getLeague = (id: number) =>
  LEAGUES.find((l) => l.leagueid === id) ?? LEAGUES[0];

/* ---------------- Pro matches ---------------- */

const STAGES = [
  "Group Stage · Round 3",
  "Group Stage · Round 2",
  "Upper Bracket · Quarterfinal",
  "Lower Bracket · Round 1",
  "Upper Bracket · Semifinal",
  "Grand Final",
];

function genProMatches(): ProMatch[] {
  const r = new Rng(2025);
  const out: ProMatch[] = [];
  let id = 8_301_990_412;
  let t = NOW - 2 * 3600;
  const leaguePlan = [
    17420, 17420, 17602, 17420, 17420, 17602, 17420, 17420, 17602, 17420, 17420,
    17602, 17101, 17101, 17101, 17101, 16935, 16935, 16935, 16935, 16935, 16935,
    16881, 16881, 16881, 16881,
  ];
  const finalIdx = leaguePlan.indexOf(16935);
  leaguePlan.forEach((leagueid, i) => {
    const league = getLeague(leagueid);
    if (t > league.end) t = league.end - r.int(1, 4) * 3600 * 6;
    if (t < league.start) t = league.start + r.int(4, 30) * 3600;
    const pool = r.shuffle(league.teams);
    const [a, b] = pool;
    const radiant_win = r.chance(0.5);
    const duration = r.int(25 * 60, 52 * 60);
    const ws = Math.round((duration / 60) * r.float(0.75, 1.1));
    const ls = Math.round(ws * r.float(0.35, 0.8));
    const series_type: ProMatch["series_type"] =
      i === finalIdx ? "Bo5" : r.chance(0.2) ? "Bo1" : "Bo3";
    const need = series_type === "Bo5" ? 3 : series_type === "Bo3" ? 2 : 1;
    const loserGames = r.int(0, need - 1);
    out.push({
      match_id: id,
      leagueid,
      radiant_team_id: a,
      dire_team_id: b,
      radiant_win,
      radiant_score: radiant_win ? ws : ls,
      dire_score: radiant_win ? ls : ws,
      duration,
      start_time: t,
      series_type,
      series_score: radiant_win ? [need, loserGames] : [loserGames, need],
      stage:
        i === finalIdx ? "Grand Final" : STAGES[r.int(0, STAGES.length - 2)],
    });
    id -= r.int(40_000, 900_000);
    t -= r.int(3, 30) * 3600;
  });
  return out;
}

export const PRO_MATCHES = genProMatches();

export const proMatchIndex = new Map(PRO_MATCHES.map((m) => [m.match_id, m]));

export const matchesForTeam = (teamId: number) =>
  PRO_MATCHES.filter(
    (m) => m.radiant_team_id === teamId || m.dire_team_id === teamId,
  );

export const matchesForLeague = (leagueId: number) =>
  PRO_MATCHES.filter((m) => m.leagueid === leagueId);

export function teamRecentResults(teamId: number) {
  const r = new Rng(teamId);
  const real = matchesForTeam(teamId).map(
    (m) => (m.radiant_team_id === teamId) === m.radiant_win,
  );
  const filler = Array.from({ length: 10 }, () =>
    r.chance(
      getTeam(teamId).wins / (getTeam(teamId).wins + getTeam(teamId).losses),
    ),
  );
  return [...real, ...filler].slice(0, 10);
}

/* ---------------- Live (mock preview) ---------------- */

function pickHeroes(r: Rng) {
  const ids = r.shuffle(HEROES.map((h) => h.id));
  const team = (offset: number) => {
    const out: number[] = [];
    const want = ["carry", "mid", "offlane", "support", "support"];
    for (const p of want) {
      const idx = ids.findIndex(
        (id, i) =>
          i >= offset &&
          !out.includes(id) &&
          primaryPosition(HEROES.find((h) => h.id === id)!) === p,
      );
      out.push(ids.splice(idx, 1)[0]);
    }
    return out;
  };
  return [team(0), team(0)];
}

export const LIVE_MATCHES: LiveMatch[] = (() => {
  const r = new Rng(777);
  const pairs: [number, number, number][] = [
    [7119388, 8599101, 17420],
    [2163, 9247354, 17420],
    [8255888, 9467224, 17602],
  ];
  return pairs.map(([a, b, leagueid], i) => {
    const [rh, dh] = pickHeroes(r);
    return {
      id: 8_312_600_100 + i * 17,
      leagueid,
      radiant_team_id: a,
      dire_team_id: b,
      game_time: r.int(9, 38) * 60 + r.int(0, 59),
      radiant_score: r.int(6, 28),
      dire_score: r.int(5, 26),
      radiant_lead: r.int(-9000, 12000),
      spectators: r.int(18000, 142000),
      game_number: r.int(1, 3),
      series_score: [r.int(0, 1), r.int(0, 1)] as [number, number],
      radiant_heroes: rh,
      dire_heroes: dh,
    };
  });
})();

/* ---------------- Leaderboards (sample) ---------------- */

export const REGIONS = [
  { id: "europe", label: "Europe" },
  { id: "americas", label: "Americas" },
  { id: "sea", label: "SE Asia" },
  { id: "china", label: "China" },
] as const;

const HANDLES = [
  "Nightingale",
  "w33haa",
  "Ghostik",
  "Ravager",
  "Abed",
  "Ghost",
  "kaka",
  "Yopaj",
  "shiro",
  "Ekki",
  "Satanic",
  "Crystallis",
  "No[o]ne",
  "Kitrak",
  "Lelis",
  "Ari",
  "K1",
  "Davai Lama",
  "Raven",
  "Natsumi",
  "Gabbi",
  "Armel",
  "Jabz",
  "Karl",
  "Akashi",
  "Ws",
  "NothingToSay",
  "Monet",
  "Emo",
  "Pyw",
  "Erika",
  "Wisper",
  "Ponlo",
  "Fishman",
  "Timado",
  "Zayac",
  "Antares",
  "Ari.vn",
  "Hiro",
  "MoonMeander",
];

const COUNTRY: Record<string, string[]> = {
  europe: ["UA", "RU", "SE", "DE", "PL", "BG", "FI", "DK"],
  americas: ["PE", "BR", "US", "CA", "BO", "AR"],
  sea: ["PH", "VN", "MY", "ID", "TH", "SG"],
  china: ["CN"],
};

export interface LeaderRow {
  rank: number;
  name: string;
  country: string;
  team?: string;
  accountId: number | null;
  delta: number;
}

export function leaderboard(region: string): LeaderRow[] {
  const r = new Rng(region.length * 991 + region.charCodeAt(0));
  const pros = r.shuffle(PRO_ROSTER).slice(0, 8);
  const names = r.shuffle(HANDLES);
  const rows: LeaderRow[] = [];
  for (let i = 0; i < 30; i++) {
    const pro = i % 3 === 0 ? pros[i / 3] : undefined;
    rows.push({
      rank: i + 1,
      name: pro ? pro.name : names[i % names.length],
      country: pro ? pro.country : r.pick(COUNTRY[region] ?? ["EU"]),
      team: pro
        ? getTeam(pro.teamId).tag
        : r.chance(0.2)
          ? r.pick(["NAVI", "Nigma", "OG", "Talon", "Heroic", "Boom"])
          : undefined,
      accountId: pro ? pro.account_id : null,
      delta: r.int(-6, 6),
    });
  }
  return rows;
}
