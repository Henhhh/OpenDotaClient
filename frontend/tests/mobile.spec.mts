import { test, expect } from "@playwright/test";
import { setupPart1 } from "./fixtures/part1.mts";
let fixture: Awaited<ReturnType<typeof setupPart1>>;
test.beforeEach(async ({ page }) => {
  fixture = await setupPart1(page);
  await page.route("**/api/v1/auth/session", (route) =>
    route.fulfill({
      status: 401,
      json: { error: { message: "Session required" } },
    }),
  );
});
test.afterEach(async () => {
  await fixture?.close();
});
test.use({ viewport: { width: 393, height: 852 } });
test("navigation, filters, search and account sign-in gate", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Good evening,")).toBeVisible();
  await page.getByRole("button", { name: "Refresh data" }).click();
  await expect(page.getByText(/API data refreshed/)).toBeVisible();
  await page.getByRole("tab", { name: "Matches", exact: true }).click();
  await page.getByRole("button", { name: "filter", exact: true }).click();
  await page.getByRole("button", { name: "Wins", exact: true }).click();
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByText("12 matches · 12 loaded")).toBeVisible();
  await page.getByRole("button", { name: "filter", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Wins", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page.getByRole("button", { name: "Apply filters" }).click();
  await page.getByRole("tab", { name: "Heroes", exact: true }).click();
  await page.getByRole("button", { name: "View as list" }).click();
  await page
    .getByRole("textbox", { name: "Search heroes" })
    .fill("Storm Spirit");
  await expect(page.getByText("1 heroes", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Home", exact: true }).click();
  await page.getByRole("tab", { name: "Heroes", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Search heroes" }),
  ).toHaveValue("Storm Spirit");
  await page.getByRole("button", { name: "Hero stats by rank" }).click();
  await expect(page.getByText("HERO · WIN RATE · PICKS")).toBeVisible();
  await page.getByRole("tab", { name: "Home", exact: true }).click();
  await page.getByRole("button", { name: "search", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Search", exact: true })
    .fill("8312547001");
  await page.getByRole("button", { name: "Open match 8312547001" }).click();
  await expect(page.getByText("Match details", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Home", exact: true }).click();
  await page
    .getByRole("button", { name: "Notifications", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("all primary and detail routes render without runtime errors", async ({
  page,
}) => {
  // This test visits 12 routes; each navigation is still bounded to 20 seconds.
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const route of [
    "/pro",
    "/profile",
    "/hero?id=17",
    "/player?id=148217346",
    "/live",
    "/rankings",
    "/team?id=7119388",
    "/league?id=17801",
    "/build?heroId=17",
    "/favorites",
    "/compare",
    "/settings",
  ]) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("tab", { name: "Home", exact: true }),
    ).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Uncaught Error");
  }
  expect(errors).toEqual([]);
});
test("profile and pro tabs", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/profile", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Recent form", { exact: true })).toBeVisible();
  for (const label of [
    "Matches",
    "Heroes",
    "Peers",
    "Statistics",
    "Overview",
  ]) {
    await page.getByRole("button", { name: label, exact: true }).click();
  }
  await page.getByRole("button", { name: "Statistics", exact: true }).click();
  await page.getByRole("button", { name: "Recent", exact: true }).click();
  await expect(
    page.getByText("20 matches · 20 samples", { exact: true }),
  ).toBeVisible();
  await page.goto("/pro", { waitUntil: "domcontentloaded" });
  for (const label of ["Teams", "Players", "Tournaments", "Matches"]) {
    await page.getByRole("button", { name: label, exact: true }).click();
  }
  expect(errors).toEqual([]);
});
test("favorite persistence", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/hero?id=1", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Abilities", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "☆ Favorite", exact: true }).click();
  await page.goto("/favorites", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Anti-Mage", { exact: true })).toBeVisible();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByText("Anti-Mage", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
test("narrow layouts", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 360, height: 780 });
  for (const route of ["/", "/heroes", "/matches", "/profile", "/pro"]) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("tab", { name: "Home", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: `test-results/${route === "/" ? "home" : route.slice(1)}-360.png`,
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(360);
  }
  expect(errors).toEqual([]);
});
