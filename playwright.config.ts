import { defineConfig } from "@playwright/test";

// Requires a running dev server against a real Neon DB + real Clerk test
// instance (set DATABASE_URL / CLERK keys / E2E_TEST_EMAIL + E2E_TEST_PASSWORD
// in .env.local before running `npm run test:e2e`). Not runnable in this
// environment without those credentials — see TODOS.md / test plan.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
