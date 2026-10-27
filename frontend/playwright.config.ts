import { defineConfig } from "@playwright/test";
const port = process.env.E2E_WEB_PORT ?? "8081";
export default defineConfig({
  testDir: "./tests",
  timeout: 90000,
  expect: { timeout: 15000 },
  workers: 1,
  use: {
    baseURL: `http://localhost:${port}`,
    channel: "msedge",
    headless: true,
    navigationTimeout: 20000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `npx expo start --offline --web --port ${port} --max-workers 2`,
    url: `http://localhost:${port}/status`,
    env: {
      EXPO_NO_DOTENV: "1",
      EXPO_PUBLIC_API_BASE_URL: "http://localhost:3000/api/v1",
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  reporter: "list",
});
