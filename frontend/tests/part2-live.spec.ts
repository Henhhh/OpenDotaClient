import { test, expect } from "@playwright/test";
test.skip(
  process.env.LIVE_PART2_API !== "1",
  "Requires the real part 2 backend on port 3000",
);
test.use({ viewport: { width: 393, height: 852 } });
test("real browser → backend → OpenDota heroes, builds and search", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/heroes");
  await expect(page.getByLabel("Anti-Mage", { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(
    page.getByText("Load more heroes", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Anti-Mage", { exact: true }).click();
  await expect(page.getByText("Abilities", { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByText("Mana Break", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Builds", exact: true }).click();
  await expect(page.getByText("START", { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByText(/purchases$/).first()).toBeVisible();
  await page.screenshot({
    path: "test-results/part2-live-builds.png",
    fullPage: true,
  });
  await page.goto("/search");
  await page.getByRole("button", { name: "Heroes", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Search", exact: true })
    .fill("Storm Spirit");
  await expect(page.getByText("Storm Spirit", { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await page.screenshot({ path: "test-results/part2-live-search.png" });
  expect(errors).toEqual([]);
});
