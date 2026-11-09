import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";

import { buildApp } from "../../src/app.js";
import { loadEnv } from "../../src/platform/config/env.js";
import { createPrismaClient } from "../../src/platform/db/client.js";
import { createFakeClock } from "../support/fakeClock.js";
import { FIXED_NOW, lendingScenarios } from "../support/lendingScenarios.js";
import { testConfig } from "../support/testConfig.js";

/*
 * Same scenarios as tests/lending.test.ts, against the real Prisma repositories.
 * Loans are deleted before Books because the foreign key restricts deletes.
 */
const wire = async () => {
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
    clock: createFakeClock(FIXED_NOW),
  });

  return {
    app,
    prisma,
    cleanup: async () => {
      try {
        await prisma.loan.deleteMany({ where: { id: { in: createdIds } } });
        await prisma.book.deleteMany({ where: { id: { in: createdIds } } });
      } finally {
        await prisma.$disconnect();
      }
    },
  };
};

lendingScenarios("prisma", wire);

it("prisma: a Book with a Loan cannot be deleted (restrictive foreign key)", async () => {
  const { app, prisma, cleanup } = await wire();
  try {
    const book = (
      await app.inject({
        method: "POST",
        url: "/books",
        payload: { title: "FK", author: "Check", isbn: "FK-1" },
      })
    ).json<{ id: string }>();
    await app.inject({
      method: "POST",
      url: "/loans",
      payload: { memberId: "member-fk", bookId: book.id },
    });

    await expect(prisma.book.delete({ where: { id: book.id } })).rejects.toThrow();
  } finally {
    await app.close();
    await cleanup();
  }
});
