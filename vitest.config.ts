import { defineConfig } from "vitest/config";

/** Tests run against the local Postgres (`docker compose up -d postgres` + `pnpm db:migrate`). */
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["node_modules/**"],
    env: { APP_ENV: "test" },
    // Every file shares one database: run them one at a time.
    fileParallelism: false,
  },
});
