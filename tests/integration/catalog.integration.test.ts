import { randomUUID } from "node:crypto";

import { buildApp } from "../../src/app.js";
import { loadEnv } from "../../src/platform/config/env.js";
import { createPrismaClient } from "../../src/platform/db/client.js";
import { catalogScenarios } from "../support/catalogScenarios.js";
import { testConfig } from "../support/testConfig.js";

/*
 * Same scenarios as tests/catalog.test.ts, against the real Prisma repository
 * on the local Postgres. Only rows created by this run are deleted, so a
 * developer's own data in the same database is never touched.
 */
catalogScenarios("prisma", async () => {
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
  });

  return {
    app,
    cleanup: async () => {
      try {
        await prisma.book.deleteMany({ where: { id: { in: createdIds } } });
      } finally {
        await prisma.$disconnect();
      }
    },
  };
});
