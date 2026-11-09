import { defineConfig } from "vitest/config";

/** Real-Postgres wiring: `pnpm test:integration` (needs `docker compose up -d postgres`). */
export default defineConfig({
  test: {
    include: ["tests/integration/**/*.integration.test.ts"],
    env: { APP_ENV: "test" },
    fileParallelism: false,
  },
});
