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
 * There is no foreign key between modules (ADR 0003), so cleanup order does not matter.
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

it("prisma: the database allows only one active Loan per Book", async () => {
  const { app, prisma, cleanup } = await wire();
  const loan = (id: string, status: "active" | "returned") => ({
    id,
    bookId: "book-unique-index",
    memberId: "member-index",
    status,
    borrowedAt: FIXED_NOW,
    dueDate: FIXED_NOW,
  });
  const ids = [randomUUID(), randomUUID(), randomUUID()] as const;
  try {
    await prisma.loan.create({ data: loan(ids[0], "active") });

    // A second active Loan for the same Book is rejected by the partial unique index...
    await expect(prisma.loan.create({ data: loan(ids[1], "active") })).rejects.toThrow();
    // ...but returned Loans do not count.
    await expect(prisma.loan.create({ data: loan(ids[2], "returned") })).resolves.toBeDefined();
  } finally {
    await prisma.loan.deleteMany({ where: { id: { in: [...ids] } } });
    await app.close();
    await cleanup();
  }
});
