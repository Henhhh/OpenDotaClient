import type { Attr } from "@/shared/types/domain";

const CDN = "https://cdn.cloudflare.steamstatic.com";

const RANK = "https://www.opendota.com/assets/images/dota2/rank_icons";

export const heroImg = (key: string) =>
  `${CDN}/apps/dota2/images/dota_react/heroes/${key}.png`;

export const heroIcon = (key: string) =>
  `${CDN}/apps/dota2/images/dota_react/heroes/icons/${key}.png`;

export const heroRender = (key: string) =>
  `${CDN}/apps/dota2/videos/dota_react/heroes/renders/${key}.png`;

export const itemImg = (key: string) =>
  `${CDN}/apps/dota2/images/dota_react/items/${key}.png`;

export const abilityImg = (key: string) =>
  `${CDN}/apps/dota2/images/dota_react/abilities/${key}.png`;

const ATTR_ICON: Record<Attr, string> = {
  str: "hero_strength",
  agi: "hero_agility",
  int: "hero_intelligence",
  all: "hero_universal",
};

export const attrIcon = (attr: Attr) =>
  `${CDN}/apps/dota2/images/dota_react/icons/${ATTR_ICON[attr]}.png`;

export const rankIcon = (tier: number, leaderboard?: number | null) => {
  const medal = Math.floor(tier / 10);
  if (medal === 8 && leaderboard)
    return `${RANK}/rank_icon_8${
      leaderboard <= 10 ? "c" : leaderboard <= 100 ? "b" : ""
    }.png`;
  return `${RANK}/rank_icon_${medal}.png`;
};

export const rankStar = (tier: number) => `${RANK}/rank_star_${tier % 10}.png`;

export const RANK_NAMES = [
  "Uncalibrated",
  "Herald",
  "Guardian",
  "Crusader",
  "Archon",
  "Legend",
  "Ancient",
  "Divine",
  "Immortal",
];

export const ROMAN = ["", "I", "II", "III", "IV", "V"];

export function rankLabel(
  tier: number | null | undefined,
  leaderboard?: number | null,
) {
  if (!tier) return "Uncalibrated";
  const medal = Math.floor(tier / 10);
  if (medal === 8) return leaderboard ? `Immortal #${leaderboard}` : "Immortal";
  return `${RANK_NAMES[medal]} ${ROMAN[tier % 10] ?? ""}`.trim();
}

export const ATTR_LABEL: Record<Attr, string> = {
  str: "Strength",
  agi: "Agility",
  int: "Intelligence",
  all: "Universal",
};

export const ATTR_COLOR: Record<Attr, string> = {
  str: "#e35d3e",
  agi: "#3fc06b",
  int: "#3fa7e3",
  all: "#b68cff",
};
