const webOrigin = `http://localhost:${process.env.E2E_WEB_PORT ?? "8081"}`;
import { type Page, expect } from "@playwright/test";
import type { AddressInfo } from "node:net";
import type { OpenDotaClient } from "../../../shared/api-contract";
import { createApp } from "../../../backend/src/app";
import { UpstreamError } from "../../../backend/src/integrations/opendota/errors";
import { mockPart2 } from "./part2";
export async function setupPart1(
  page: Page,
  options: { signedIn?: boolean; parse?: boolean } = {},
) {
  await mockPart2(page);
  const calls: { path: string; query: unknown }[] = [],
    posts: string[] = [],
    time = "2026-10-27T00:00:00Z";
  const detail = {
    match_id: "9007199254740993",
    start_time: Math.floor(Date.now() / 1000) - 3600,
    duration: 1200,
    game_mode: 22,
    lobby_type: 7,
    radiant_win: true,
    radiant_score: 30,
    dire_score: 20,
    version: null as number | null,
    players: [
      {
        player_slot: 0,
        account_id: null,
        hero_id: 1,
        kills: 10,
        deaths: 2,
        assists: 6,
        item_0: 1,
        item_1: 0,
        backpack_0: 0,
        purchase_log: [{ key: "blink", time: -30 }],
        ability_upgrades_arr: [5001],
      },
    ],
    radiant_gold_adv: [0, 100, 200],
    radiant_xp_adv: [0, 200, 300],
    picks_bans: null,
  };
  const history = Array.from({ length: 23 }, (_, i) => ({
    match_id: String(1000 + i),
    start_time: detail.start_time - i * 3600,
    duration: 1200,
    game_mode: i === 22 ? 23 : 22,
    lobby_type: i === 22 ? 0 : 7,
    radiant_win: i % 2 === 0,
    player_slot: 0,
    hero_id: i % 2 ? 17 : 1,
    kills: 10,
    deaths: 2,
    assists: 6,
    version: null,
  }));
  const state = {
    private: false,
    empty: false,
    fail: false,
    missingJob: false,
  };
  const client: OpenDotaClient = {
    async get(path, query, opts) {
      calls.push({ path, query });
      let raw: unknown;
      if (path.startsWith("/players/")) {
        const id = path.split("/")[2],
          endpoint = path.split("/")[3];
        if (id === "404") throw new UpstreamError("not_found");
        if (!endpoint)
          raw = {
            profile: {
              account_id: Number(id),
              personaname: "API Player " + id,
              fh_unavailable: state.private,
            },
            rank_tier: 54,
          };
        else if (state.fail) throw new UpstreamError("unavailable");
        else if (endpoint === "matches" || endpoint === "recentMatches")
          raw = state.empty ? [] : history;
        else if (endpoint === "wl") raw = { win: 12, lose: 11 };
        else if (endpoint === "totals")
          raw = [
            { field: "kills", n: 23, sum: 230 },
            { field: "deaths", n: 23, sum: 46 },
            { field: "assists", n: 23, sum: 138 },
            { field: "duration", n: 23, sum: 27600 },
          ];
        else if (endpoint === "heroes")
          raw = state.empty
            ? []
            : [
                {
                  hero_id: 1,
                  games: 12,
                  win: 8,
                  last_played: detail.start_time,
                },
                {
                  hero_id: 17,
                  games: 11,
                  win: 4,
                  last_played: detail.start_time,
                },
              ];
        else if (endpoint === "peers")
          raw = [
            {
              account_id: 2,
              personaname: "API Teammate",
              with_games: 9,
              with_win: 6,
            },
          ];
        else if (endpoint === "ratings") raw = [];
      } else if (path.startsWith("/matches/"))
        raw = { ...detail, match_id: path.split("/")[2] };
      else if (path === "/constants/items")
        raw = {
          blink: {
            id: 1,
            dname: "Blink Dagger",
            cost: 2250,
            img: "/apps/dota2/images/items/blink_lg.png",
          },
        };
      else if (path === "/request/777")
        raw = state.missingJob
          ? null
          : { id: 777, type: "parse", data: { match_id: detail.match_id } };
      if (raw === undefined) throw new UpstreamError("not_found");
      return { data: opts.validate(structuredClone(raw)), fetched_at: time };
    },
    async post(path, _body, opts) {
      posts.push(path);
      return { data: opts.validate({ job: { jobId: 777 } }), fetched_at: time };
    },
  };
  const backend = createApp({
    client,
    databasePath: ":memory:",
    allowedWebOrigins: [webOrigin],
    enableMatchParse: options.parse ?? true,
    auth: {
      production: false,
      webOrigins: [webOrigin],
    },
  });
  if (options.signedIn) {
    const session = backend.foundation.sessions.createForVerifiedAccount(
      "1",
      "web",
    );
    await page.context().addCookies([
      {
        name: "opendota_session",
        value: session.token,
        url: webOrigin,
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
  }
  const server = backend.app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    if (
      !/^\/api\/v1\/(players|matches|parse-jobs|auth|me)(\/|$)/.test(
        url.pathname,
      )
    )
      return route.fallback();
    const response = await route.fetch({
      url: origin + url.pathname + url.search,
      maxRedirects: 0,
    });
    await route.fulfill({ response });
  });
  return {
    backend,
    calls,
    posts,
    detail,
    state,
    close: async () => {
      await new Promise<void>((resolve, reject) =>
        server.close((e) => (e ? reject(e) : resolve())),
      );
      backend.close();
    },
  };
}
export async function selectAccount(page: Page, id = "1") {
  await page
    .getByRole("textbox", { name: "Player account ID", exact: true })
    .fill(id);
  await page.getByRole("button", { name: "View player", exact: true }).click();
  await expect(
    page.getByText("API Player " + id, { exact: true }),
  ).toBeVisible();
}
