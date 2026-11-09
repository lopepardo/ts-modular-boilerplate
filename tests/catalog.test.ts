import { buildApp } from "../src/app.js";
import { createInMemoryBookRepository } from "../src/modules/catalog/index.js";
import { catalogScenarios } from "./support/catalogScenarios.js";
import { fakePrisma } from "./support/fakePrisma.js";
import { testConfig } from "./support/testConfig.js";

catalogScenarios("in-memory", async () => {
  let nextId = 0;
  const app = await buildApp({
    config: testConfig,
    prisma: fakePrisma,
    generateId: () => `00000000-0000-4000-8000-${String(++nextId).padStart(12, "0")}`,
    catalog: { repository: createInMemoryBookRepository() },
  });
  return { app };
});
