import { buildApp } from "../src/app.js";
import { createInMemoryBookRepository } from "../src/modules/catalog/index.js";
import { createInMemoryLoanRepository } from "../src/modules/lending/index.js";
import { createFakeClock } from "./support/fakeClock.js";
import { fakePrisma } from "./support/fakePrisma.js";
import { FIXED_NOW, lendingScenarios } from "./support/lendingScenarios.js";
import { testConfig } from "./support/testConfig.js";

lendingScenarios("in-memory", async () => {
  let nextId = 0;
  const app = await buildApp({
    config: testConfig,
    prisma: fakePrisma,
    generateId: () => `00000000-0000-4000-8000-${String(++nextId).padStart(12, "0")}`,
    clock: createFakeClock(FIXED_NOW),
    catalog: { repository: createInMemoryBookRepository() },
    lending: { repository: createInMemoryLoanRepository() },
  });
  return { app };
});
