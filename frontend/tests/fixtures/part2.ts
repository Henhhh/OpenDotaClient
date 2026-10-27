import type { Page } from "@playwright/test";
const hero = (id: string, name: string) => ({
  hero_id: id,
  key: id === "1" ? "antimage" : "storm_spirit",
  name,
  primary_attr: "agi",
  attack_type: "Melee",
  roles: ["Carry"],
  image_url: null,
  icon_url: null,
});
export async function mockPart2(page: Page) {
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace("/api/v1", "");
    const heroes = [hero("1", "Anti-Mage"), hero("17", "Storm Spirit")];
    const paged = (items: unknown[]) => ({
      items,
      limit: Number(url.searchParams.get("limit") ?? 20),
      offset: Number(url.searchParams.get("offset") ?? 0),
      has_more: false,
      total: items.length,
    });
    let data: unknown;
    if (path === "/heroes")
      data = paged(
        heroes.filter(
          (h) =>
            !url.searchParams.get("q") ||
            h.name
              .toLowerCase()
              .includes(url.searchParams.get("q")!.toLowerCase()),
        ),
      );
    else if (path === "/heroes/stats")
      data = paged(
        heroes.map((h) => ({
          hero_id: h.hero_id,
          bracket: null,
          picks: 20,
          wins: 12,
          bans: null,
          win_rate: 0.6,
          pick_rate: null,
          sample_matches: null,
        })),
      );
    else if (/^\/heroes\/\d+$/.test(path))
      data = {
        ...heroes.find((h) => h.hero_id === path.split("/").pop()),
        base_health: 120,
        base_mana: 75,
        base_armor: 2,
        base_str: 20,
        base_agi: 20,
        base_int: 20,
        str_gain: 2,
        agi_gain: 2,
        int_gain: 2,
        move_speed: 300,
        attack_range: 150,
        abilities: [
          {
            key: "blink",
            name: "Blink",
            description: "Teleport",
            image_url: null,
          },
        ],
        talents: null,
      };
    else if (path.endsWith("/matchups"))
      data = paged([
        {
          hero_id: "1",
          against_hero_id: "17",
          games: 12,
          wins: 8,
          win_rate: 2 / 3,
        },
      ]);
    else if (path.endsWith("/rankings")) {
      await route.fulfill({
        status: 501,
        json: {
          error: { code: "FEATURE_UNAVAILABLE", message: "Not enabled" },
        },
      });
      return;
    } else if (path === "/constants/items")
      data = paged([
        {
          item_id: "1",
          key: "blink",
          name: "Blink Dagger",
          image_url: null,
          cost: 2250,
          description: "Teleport",
        },
      ]);
    else if (path.endsWith("/items"))
      data = {
        hero_id: "1",
        source_population: "professional",
        phases: [{ phase: "start", items: [{ item_id: "1", count: 23 }] }],
      };
    else if (path === "/search") {
      const q = url.searchParams.get("q")!,
        type = url.searchParams.get("type");
      data = {
        heroes:
          type === "hero" || type === "all"
            ? heroes.filter((h) =>
                h.name.toLowerCase().includes(q.toLowerCase()),
              )
            : [],
        players: [],
        teams: [],
        match:
          (type === "match" || type === "all") && /^\d+$/.test(q)
            ? { match_id: q, verified: false }
            : null,
      };
    } else {
      await route.abort();
      return;
    }
    await route.fulfill({
      json: {
        data,
        meta: {
          request_id: "fixture",
          fetched_at: "2026-10-27T00:00:00Z",
          source: "opendota",
          stale: false,
          unavailable_fields: [],
        },
      },
    });
  });
}
