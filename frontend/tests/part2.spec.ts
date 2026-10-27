import { test, expect } from "@playwright/test";
import { mockPart2 } from "./fixtures/part2";
test.use({ viewport: { width: 393, height: 852 } });
test.beforeEach(async ({ page }) => {
  await mockPart2(page);
});
test("API hero detail, matchups, build items and disabled rankings", async ({
  page,
}) => {
  await page.goto("/hero?id=1");
  await expect(page.getByText("Blink", { exact: true })).toBeVisible();
  await expect(page.getByText("Talent data unavailable.")).toBeVisible();
  await page.getByRole("button", { name: "Statistics", exact: true }).click();
  await expect(page.getByText(/Win rate 60.0%/)).toBeVisible();
  await page.getByRole("button", { name: "Matchups", exact: true }).click();
  await expect(page.getByText(/12 games/)).toBeVisible();
  await page.getByRole("button", { name: "Builds", exact: true }).click();
  await expect(page.getByText("Blink Dagger", { exact: true })).toBeVisible();
  await expect(page.getByText(/23 purchases/)).toBeVisible();
  await page.getByRole("button", { name: "Players", exact: true }).click();
  await expect(
    page.getByText("This feature is not enabled on the backend yet."),
  ).toBeVisible();
});
test("API failure can retry; empty heroes has no sample fallback", async ({
  page,
}) => {
  let failed = true;
  await page.route("**/api/v1/heroes?**", async (route) => {
    if (failed) {
      await route.fulfill({
        status: 504,
        json: { error: { message: "OpenDota request failed" } },
      });
      return;
    }
    await route.fulfill({
      json: {
        data: { items: [], total: 0, limit: 40, offset: 0, has_more: false },
        meta: { fetched_at: "2026-10-27T00:00:00Z" },
      },
    });
  });
  await page.goto("/heroes");
  await expect(page.getByText("OpenDota request failed")).toBeVisible();
  failed = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByText("No heroes found")).toBeVisible();
  await expect(page.getByText("Anti-Mage", { exact: true })).toHaveCount(0);
});
test("Search calls selected backend category and opens API hero ID", async ({
  page,
}) => {
  await page.goto("/search");
  await page.getByRole("button", { name: "Heroes", exact: true }).click();
  const request = page.waitForRequest(
    (req) =>
      req.url().includes("/api/v1/search?") && req.url().includes("type=hero"),
  );
  await page
    .getByRole("textbox", { name: "Search", exact: true })
    .fill("Storm");
  await request;
  await page.getByText("Storm Spirit", { exact: true }).click();
  await expect(page).toHaveURL(/hero\?.*id=17/);
  await expect(page.getByText("Blink", { exact: true })).toBeVisible();
});
test("hero pagination appends rows and changing filters resets the page", async ({
  page,
}) => {
  const requests: URL[] = [];
  await page.route("**/api/v1/heroes?**", async (route) => {
    const url = new URL(route.request().url());
    requests.push(url);
    const offset = Number(url.searchParams.get("offset"));
    const name = url.searchParams.get("primary_attr")
      ? "Filtered hero"
      : offset
        ? "Second page hero"
        : "First page hero";
    await route.fulfill({
      json: {
        data: {
          items: [
            {
              hero_id: String(offset + 1),
              name,
              image_url: null,
              primary_attr: "agi",
              attack_type: "Melee",
              roles: [],
            },
          ],
          offset,
          limit: 40,
          has_more: offset === 0 && !url.searchParams.has("primary_attr"),
          total: 41,
        },
        meta: { fetched_at: "2026-10-27T00:00:00Z" },
      },
    });
  });
  await page.goto("/heroes");
  await page
    .getByRole("button", { name: "Load more heroes", exact: true })
    .click();
  await expect(
    page.getByText("Second page hero", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("First page hero", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "AGI", exact: true }).click();
  await expect(page.getByText("Filtered hero", { exact: true })).toBeVisible();
  await expect(page.getByText("Second page hero", { exact: true })).toHaveCount(
    0,
  );
  expect(requests.at(-1)?.searchParams.get("offset")).toBe("0");
});
test("network disconnect shows a recoverable error without sample data", async ({
  page,
}) => {
  let disconnected = true;
  await page.route("**/api/v1/heroes?**", async (route) => {
    if (disconnected) await route.abort("internetdisconnected");
    else await route.fallback();
  });
  await page.goto("/heroes");
  await expect(
    page.getByText(
      "Cannot reach the API. Check the connection and backend address.",
    ),
  ).toBeVisible();
  await expect(page.getByText("Anti-Mage", { exact: true })).toHaveCount(0);
  disconnected = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByText("Anti-Mage", { exact: true })).toBeVisible();
});
test("Search never shows old results after the input changes", async ({
  page,
}) => {
  await page.goto("/search");
  await page.getByRole("button", { name: "Heroes", exact: true }).click();
  const input = page.getByRole("textbox", { name: "Search", exact: true });
  await input.fill("Anti");
  await expect(page.getByText("Anti-Mage", { exact: true })).toBeVisible();
  await input.fill("Storm");
  await expect(page.getByText("Anti-Mage", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Storm Spirit", { exact: true })).toBeVisible();
  await input.fill("a");
  await expect(page.getByText("Enter at least 2 characters.")).toBeVisible();
  await expect(page.getByText("Storm Spirit", { exact: true })).toHaveCount(0);
});
test("rankings pages append correctly and missing avatars do not break rendering", async ({
  page,
}) => {
  await page.route("**/api/v1/heroes/1/rankings?**", async (route) => {
    const offset = Number(
      new URL(route.request().url()).searchParams.get("offset"),
    );
    await route.fulfill({
      json: {
        data: {
          items: [
            {
              hero_id: "1",
              position: offset + 1,
              score: 10,
              player: {
                account_id: String(offset + 1),
                name: offset ? "Second pro" : "First pro",
                avatar_url: null,
              },
            },
          ],
          offset,
          limit: 40,
          total: 41,
          has_more: offset === 0,
        },
        meta: { fetched_at: "2026-10-27T00:00:00Z" },
      },
    });
  });
  await page.goto("/hero?id=1");
  await page.getByRole("button", { name: "Players", exact: true }).click();
  await expect(page.getByText("1. First pro", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Load more players", exact: true })
    .click();
  await expect(page.getByText("41. Second pro", { exact: true })).toBeVisible();
  await expect(page.getByText("1. First pro", { exact: true })).toBeVisible();
});
test("match builds show no fabricated inventory and handle missing abilities", async ({
  page,
}) => {
  await page.route("**/api/v1/heroes/1", async (route) => {
    await route.fulfill({
      json: {
        data: {
          hero_id: "1",
          name: "Anti-Mage",
          abilities: null,
          talents: null,
        },
        meta: { fetched_at: "2026-10-27T00:00:00Z" },
      },
    });
  });
  await page.goto("/build?heroId=1&matchId=123&slot=0");
  await expect(
    page.getByText(/Inventory and purchase timeline for match 123/),
  ).toBeVisible();
  await expect(page.getByText("Final inventory", { exact: true })).toHaveCount(
    0,
  );
  await page
    .getByRole("button", { name: "Skills & talents", exact: true })
    .click();
  await expect(
    page.getByText("Ability data unavailable.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Talent data unavailable.", { exact: true }),
  ).toBeVisible();
});
for (const width of [320, 768]) {
  test("part 2 layout stays within viewport " + width, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/heroes",
      "/hero?id=1",
      "/heroRanks",
      "/build?heroId=1",
      "/search",
    ]) {
      await page.goto(path);
      await expect(
        page.getByRole("tab", { name: "Home", exact: true }),
      ).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
    }
  });
}
