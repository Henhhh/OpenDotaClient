import { test, expect } from "@playwright/test";
import { setupPart1, selectAccount } from "./fixtures/part1.mts";
test.use({ viewport: { width: 393, height: 852 } });
test.setTimeout(180000);
test("Home and Profile use backend data, switch accounts, refresh, heroes, peers and unavailable rank", async ({
  page,
}) => {
  const f = await setupPart1(page),
    errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.goto("/");
    await selectAccount(page);
    const before = f.calls.filter((c) => c.path === "/players/1").length;
    await expect(
      page.getByRole("button", { name: "Refresh data", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Refresh data", exact: true })
      .click();
    await expect(
      page.getByText("API data refreshed", { exact: true }),
    ).toBeVisible();
    expect(
      f.calls.filter((c) => c.path === "/players/1").length,
    ).toBeGreaterThan(before);
    await page
      .getByRole("button", { name: "View profile", exact: true })
      .click();
    await expect(
      page
        .getByTestId("screen-profile")
        .getByText("API Player 1", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Heroes", exact: true }).click();
    await expect(
      page.getByTestId("screen-profile").getByText("12 games · 8W / 4L"),
    ).toBeVisible();
    await page.getByRole("button", { name: "Win rate", exact: true }).click();
    await page.getByRole("button", { name: "Peers", exact: true }).click();
    await expect(page.getByText("API Teammate", { exact: true })).toBeVisible();
    await page.getByText("API Teammate", { exact: true }).click();
    await expect(page.getByText("API Player 2", { exact: true })).toBeVisible();
    await page.goto("/profile");
    await page.getByRole("button", { name: "Statistics", exact: true }).click();
    await page.getByRole("button", { name: "Recent", exact: true }).click();
    await expect(page.getByText("20 matches · 20 samples")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("NaN");
    await page.reload();
    await expect(
      page.getByRole("textbox", { name: "Player account ID" }),
    ).toHaveValue("1");
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto("/");
    await expect(
      page.getByText("API Player 1", { exact: true }).filter({ visible: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(360);
    await page.screenshot({
      path: "test-results/part1-home-360.png",
      fullPage: true,
    });
    expect(errors).toEqual([]);
  } finally {
    await f.close();
  }
});
test("Match history paginates and sends filters; match IDs retain all digits", async ({
  page,
}) => {
  const f = await setupPart1(page);
  try {
    await page.goto("/matches");
    await page.getByRole("textbox", { name: "Player account ID" }).fill("1");
    await page
      .getByRole("button", { name: "View player", exact: true })
      .click();
    await expect(page.getByText("23 matches · 20 loaded")).toBeVisible();
    await page
      .getByRole("button", { name: "Load more matches", exact: true })
      .click();
    await expect(page.getByText("23 matches · 23 loaded")).toBeVisible();
    await page.getByRole("button", { name: "☷ Filters", exact: true }).click();
    await page.getByRole("button", { name: "Wins", exact: true }).click();
    await page.getByRole("button", { name: "7 days", exact: true }).click();
    await page
      .getByRole("button", { name: "Apply filters", exact: true })
      .click();
    await expect(page.getByText("12 matches · 12 loaded")).toBeVisible();
    expect(
      f.calls.some(
        (c) =>
          c.path === "/players/1/matches" &&
          (c.query as Record<string, unknown>).win === 1,
      ),
    ).toBe(true);
    await page
      .getByRole("textbox", { name: "Match ID", exact: true })
      .fill("9007199254740993");
    await page.getByRole("button", { name: "Open", exact: true }).click();
    await expect(page.getByText(/Match 9007199254740993 ·/)).toBeVisible();
    await page.getByRole("button", { name: "Scoreboard", exact: true }).click();
    await expect(
      page.getByText("Anonymous player", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Analysis", exact: true }).click();
    await expect(
      page.getByText("Sign in to request match parsing."),
    ).toBeVisible();
  } finally {
    await f.close();
  }
});
test("Players show private, missing, empty and upstream errors without sample fallback", async ({
  page,
}) => {
  const f = await setupPart1(page);
  try {
    f.state.private = true;
    await page.goto("/player?id=1");
    await expect(
      page.getByText("This player has private match history."),
    ).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Kaito");
    await page.goto("/player?id=404");
    await expect(
      page.getByText("No data found for this ID.").first(),
    ).toBeVisible();
    f.state.private = false;
    f.state.empty = true;
    await page.goto("/matches");
    await expect(
      page.getByText("No matches match these filters."),
    ).toBeVisible();
    f.state.empty = false;
    f.state.fail = true;
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Retry", exact: true }).first(),
    ).toBeVisible();
    await expect(page.locator("body")).not.toContainText("SAMPLE DATA");
  } finally {
    await f.close();
  }
});
test("Compare validates IDs, preserves order and switches stats scope", async ({
  page,
}) => {
  const f = await setupPart1(page);
  try {
    await page.goto("/compare");
    await page.getByRole("textbox", { name: "First account ID" }).fill("1");
    await page.getByRole("textbox", { name: "Second account ID" }).fill("1");
    await page
      .getByRole("button", { name: "Compare players", exact: true })
      .click();
    await expect(
      page.getByText("Enter two different valid account IDs."),
    ).toBeVisible();
    await page.getByRole("textbox", { name: "Second account ID" }).fill("2");
    await page
      .getByRole("button", { name: "Compare players", exact: true })
      .click();
    await expect(
      page.getByText("API Player 1", { exact: true }).filter({ visible: true }),
    ).toBeVisible();
    await expect(page.getByText("API Player 2", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Recent", exact: true }).click();
    await expect
      .poll(() => f.calls.some((c) => c.path === "/players/2/recentMatches"))
      .toBe(true);
    expect(await page.getByText(/^API Player [12]$/).allTextContents()).toEqual(
      ["API Player 1", "API Player 2"],
    );
  } finally {
    await f.close();
  }
});
test("Session parse submits once, verifies completion and refreshes parsed inventory", async ({
  page,
}) => {
  const f = await setupPart1(page, { signedIn: true });
  try {
    await page.goto("/match?id=9007199254740993");
    await page.getByRole("button", { name: "Analysis", exact: true }).click();
    await page
      .getByRole("button", { name: "Request parse", exact: true })
      .click();
    await expect(page.getByText("Parse status: queued")).toBeVisible();
    expect(f.posts).toHaveLength(1);
    f.detail.version = 1;
    await expect(
      page.getByText("Experience advantage", { exact: true }),
    ).toBeVisible({ timeout: 18000 });
    await expect(page.getByText("Match parsing", { exact: true })).toHaveCount(
      0,
    );
    expect(f.posts).toHaveLength(1);
    await page.getByRole("button", { name: "Builds", exact: true }).click();
    await expect(
      page.getByText("-0:30 · Blink Dagger", { exact: true }),
    ).toBeVisible();
    expect(f.calls.some((c) => c.path === "/request/777")).toBe(true);
  } finally {
    await f.close();
  }
});
test("Parse unavailable stays explicit and unknown polling stops after two minutes", async ({
  page,
}) => {
  const f = await setupPart1(page, { signedIn: true });
  try {
    f.state.missingJob = true;
    await page.clock.install();
    await page.goto("/match?id=9007199254740993");
    await page.getByRole("button", { name: "Analysis", exact: true }).click();
    await page
      .getByRole("button", { name: "Request parse", exact: true })
      .click();
    await expect(page.getByText("Parse status: unknown")).toBeVisible();
    expect(f.posts).toHaveLength(1);
    await page.clock.fastForward(121000);
    await expect(
      page.getByText(/Automatic polling stopped after 2 minutes/),
    ).toBeVisible();
    const count = f.calls.filter((c) => c.path === "/request/777").length;
    await page.clock.fastForward(30000);
    expect(f.calls.filter((c) => c.path === "/request/777")).toHaveLength(
      count,
    );
    expect(f.posts).toHaveLength(1);
  } finally {
    await f.close();
  }
});
test("Disabled parse reports 501 for a signed-in user", async ({ page }) => {
  const f = await setupPart1(page, { signedIn: true, parse: false });
  try {
    await page.goto("/match?id=9007199254740993");
    await page.getByRole("button", { name: "Analysis", exact: true }).click();
    await page
      .getByRole("button", { name: "Request parse", exact: true })
      .click();
    await expect(
      page.getByText("This feature is not enabled on the backend yet."),
    ).toBeVisible();
    expect(f.posts).toHaveLength(0);
  } finally {
    await f.close();
  }
});
