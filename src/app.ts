import Fastify from "fastify";

import { prisma } from "./platform/db/client.js";
import { registerHttpPlugins } from "./platform/http/plugins.js";
import {
  createPrismaExpensesRepository,
  type ExpensesRepository,
} from "./repositories/expenses.js";
import { expensesRoutes } from "./routes/expenses.js";
import { createExpensesService } from "./services/expenses.js";
import { systemClock, type Clock } from "./shared/clock.js";
import { uuidGenerator, type IdGenerator } from "./shared/ids.js";

export type AppDependencies = {
  clock: Clock;
  generateId: IdGenerator;
  expensesRepository: ExpensesRepository;
};

/** Single composition root (ADR 0002): real dependencies unless overridden. */
export const buildApp = async (overrides: Partial<AppDependencies> = {}) => {
  const deps: AppDependencies = {
    clock: systemClock,
    generateId: uuidGenerator,
    expensesRepository: createPrismaExpensesRepository(prisma),
    ...overrides,
  };

  const app = Fastify({ logger: true });

  await registerHttpPlugins(app);

  const expensesService = createExpensesService(deps.expensesRepository);
  await app.register(expensesRoutes(expensesService), { prefix: "/expenses" });

  return app;
};
