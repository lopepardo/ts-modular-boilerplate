import { randomUUID } from "node:crypto";

import { buildApp } from "../../src/app.js";
import { loadEnv } from "../../src/platform/config/env.js";
import { createPrismaClient, type PrismaClient } from "../../src/platform/db/client.js";
import type { Clock } from "../../src/shared/clock.js";
import { testConfig } from "./testConfig.js";

type TestAppOptions = {
  clock?: Clock;
  /** Deletes the rows this run created; `ids` are every id the app generated. */
  purge?: (prisma: PrismaClient, ids: string[]) => Promise<unknown>;
};

/**
 * The app wired for tests: real Prisma repositories on the local Postgres
 * (`docker compose up -d postgres` + `pnpm db:migrate`). Only rows created by
 * this run are deleted, so a developer's own data in the same database is
 * never touched.
 */
export const createTestApp = async ({ clock, purge }: TestAppOptions = {}) => {
  const prisma = createPrismaClient(loadEnv());
  const createdIds: string[] = [];

  const app = await buildApp({
    config: testConfig,
    prisma,
    generateId: () => {
      const id = randomUUID();
      createdIds.push(id);
      return id;
    },
    ...(clock && { clock }),
  });

  return {
    app,
    prisma,
    /** Closes the app, deletes what the run created and releases the connection. */
    cleanup: async () => {
      try {
        await app.close();
        await purge?.(prisma, createdIds);
      } finally {
        await prisma.$disconnect();
      }
    },
  };
};
