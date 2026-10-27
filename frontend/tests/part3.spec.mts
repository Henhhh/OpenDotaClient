import { test, expect, type Page } from "@playwright/test";
import type { AddressInfo } from "node:net";
import { createApp } from "../../backend/src/app";
import type { OpenDotaClient } from "../../shared/api-contract";

test.use({ viewport: { width: 393, height: 852 } });
test.setTimeout(180000);
const time = "2026-10-27T00:00:00Z";
const teams = Array.from({ length: 21 }, (_, i) => ({
  team_id: i + 1,
  name: `API Team ${i + 1}`,
  rating: 1500 - i,
  wins: 10,
  losses: 5,
}));
const fixtures: Record<string, unknown> = {
  "/teams": teams,
  "/teams/1": teams[0],
  "/teams/1/players": [
    { account_id: 1, name: "API Player", is_current_team_member: true },
  ],
  "/teams/1/matches": [],
  "/proPlayers": [
    { account_id: 1, name: "API Player", team_id: 1, team_name: "API Team 1" },
  ],
  "/leagues": [{ leagueid: 1, name: "API League" }],
  "/leagues/1": { leagueid: 1, name: "API League" },
  "/leagues/1/teams": [teams[0]],
  "/leagues/1/matches": [],
  "/proMatches": [
    {
      match_id: 123,
      start_time: 1793000000,
      duration: 1200,
      game_mode: 1,
      lobby_type: 1,
      radiant_win: true,
      radiant_score: 30,
      dire_score: 20,
      radiant_team_id: 1,
      dire_team_id: 2,
    },
  ],
};
async function setup(page: Page) {
  const client: OpenDotaClient = {
    async get(path, _query, options) {
      return { data: options.validate(fixtures[path] ?? []), fetched_at: time };
    },
    async post() {
      throw new Error("Unexpected upstream POST");
    },
  };
  const identity = { account: "1" };
  const backend = createApp({
    client,
    databasePath: ":memory:",
    allowedWebOrigins: ["http://localhost:8081"],
    auth: {
      publicBaseUrl: "http://localhost:3000",
      production: false,
      webOrigins: ["http://localhost:8081"],
      webRedirects: ["http://localhost:8081/auth/callback"],
      nativeRedirects: ["opendota://auth/callback"],
    },
    verifySteam: async (_p, returnTo) => ({
      account_id: identity.account,
      nonce: returnTo,
    }),
  });
  const server = backend.app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  await page.route("**/api/v1/**", async (route) => {
    const incoming = new URL(route.request().url());
    const response = await route.fetch({
      url: origin + incoming.pathname + incoming.search,
      maxRedirects: 0,
    });
    await route.fulfill({ response });
  });
  // Only tests replace Steam identity verification; the actual backend exchanges code/session/cookies.
  await page.route(
    "https://steamcommunity.com/openid/login?**",
    async (route) => {
      const returnTo = new URL(route.request().url()).searchParams.get(
        "openid.return_to",
      )!;
      await route.fulfill({
        status: 302,
        headers: { location: returnTo },
        body: "",
      });
    },
  );
  return {
    backend,
    identity,
    close: async () => {
      await new Promise<void>((resolve, reject) =>
        server.close((e) => (e ? reject(e) : resolve())),
      );
      backend.close();
    },
  };
}
async function signIn(page: Page) {
  await page.goto("/settings", { waitUntil: "domcontentloaded" });
  await page
    .getByRole("button", { name: "Sign in with Steam", exact: true })
    .click();
  await expect(page.getByText(/Steam account \d/)).toBeVisible();
}

test("Pro Scene uses real backend routers: tabs, pagination, team/league details and unavailable live", async ({
  page,
}) => {
  const fixture = await setup(page);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.goto("/pro", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/Match 123/)).toBeVisible();
    await page.getByRole("button", { name: "Teams", exact: true }).click();
    await expect(page.getByText("API Team 1", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Load more", exact: true }).click();
    await expect(page.getByText("API Team 21", { exact: true })).toBeVisible();
    await page.getByText("API Team 1", { exact: true }).click();
    await expect(page.getByText("API Player", { exact: true })).toBeVisible();
    await page.goto("/pro", { waitUntil: "domcontentloaded" });
    await page
      .getByRole("button", { name: "Tournaments", exact: true })
      .click();
    await page.getByText("API League", { exact: true }).click();
    await expect(page.getByText("API Team 1", { exact: true })).toBeVisible();
    await page.goto("/live", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByText("This feature is not enabled on the backend yet."),
    ).toBeVisible();
    await page.goto("/rankings", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Players", exact: true }).click();
    await expect(
      page.getByText(/Regional player MMR leaderboards are not available/),
    ).toBeVisible();
    expect(errors).toEqual([]);
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto("/pro", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/Match 123/)).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(360);
    await page.screenshot({
      path: "test-results/part3-pro-360.png",
      fullPage: true,
    });
  } finally {
    await fixture.close();
  }
});
test("Steam web callback establishes cookie session, syncs favorites/settings/notifications and isolates accounts", async ({
  page,
}) => {
  const fixture = await setup(page);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await signIn(page);
    await expect(
      page.getByText("Steam account 1", { exact: true }),
    ).toBeVisible();
    const user = fixture.backend.foundation.sessions;
    // Guest sample favorites must not be silently imported when signing in.
    expect(
      fixture.backend.foundation.me.favorites(
        user.createForVerifiedAccount("1", "native").principal.user_id,
      ),
    ).toHaveLength(0);
    await page.goto("/team?id=1", { waitUntil: "domcontentloaded" });
    await page
      .getByRole("button", { name: "Favorite team", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Remove team favorite", exact: true }),
    ).toBeVisible();
    await page.goto("/favorites", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Teams", exact: true }).click();
    await expect(page.getByText("API Team 1", { exact: true })).toBeVisible();
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Teams", exact: true }).click();
    await expect(page.getByText("API Team 1", { exact: true })).toBeVisible();
    await page.goto("/notifications", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByText("Steam sign-in successful", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Mark all read", exact: true })
      .click();
    await expect(page.getByText("0 unread", { exact: true })).toBeVisible();
    await page.goto("/settings", { waitUntil: "domcontentloaded" });
    await page
      .getByRole("switch", { name: "Enable in-app notifications" })
      .click();
    await expect(
      page.getByRole("switch", { name: "Enable in-app notifications" }),
    ).not.toBeChecked();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("switch", { name: "Enable in-app notifications" }),
    ).not.toBeChecked();
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Sign in with Steam", exact: true }),
    ).toBeVisible();
    fixture.identity.account = "2";
    await signIn(page);
    await expect(
      page.getByText("Steam account 2", { exact: true }),
    ).toBeVisible();
    await page.goto("/favorites", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Teams", exact: true }).click();
    await expect(
      page.getByText("No favorites yet.", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("API Team 1", { exact: true })).toHaveCount(0);
    expect(errors).toEqual([]);
  } finally {
    await fixture.close();
  }
});
test("callback rejects missing local state without exchanging a code; API failures show retry", async ({
  page,
}) => {
  const fixture = await setup(page);
  try {
    await page.goto("/auth/callback?code=forged&state=forged", {
      waitUntil: "domcontentloaded",
    });
    await expect(
      page.getByText("Steam sign-in failed", { exact: true }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/callback$/);
    await page.route("**/api/v1/pro/teams?**", (route) =>
      route.fulfill({
        status: 504,
        json: { error: { message: "OpenDota request failed" } },
      }),
    );
    await page.goto("/rankings", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByText("OpenDota request failed", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Retry", exact: true }),
    ).toBeVisible();
  } finally {
    await fixture.close();
  }
});
