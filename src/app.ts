import type { PrismaClient } from "./platform/db/client.js";
import { createServer, type ServerConfig } from "./platform/http/createServer.js";

import { systemClock, type Clock } from "./shared/clock.js";
import { uuidGenerator, type IdGenerator } from "./shared/ids.js";

import { createCatalogModule, createPrismaBookRepository } from "./modules/catalog/index.js";
import { createLendingModule, createPrismaLoanRepository } from "./modules/lending/index.js";

export type AppDeps = {
  config: ServerConfig;
  prisma: PrismaClient;
  /** Tests inject a deterministic id generator and clock; omitted, the real ones are used. */
  generateId?: IdGenerator;
  clock?: Clock;
};

/** Composition root: wires modules to their infrastructure. */
export const buildApp = async (deps: AppDeps) => {
  const { config, prisma, generateId = uuidGenerator, clock = systemClock } = deps;

  const app = await createServer(config);

  const catalog = createCatalogModule({
    generateId,
    repository: createPrismaBookRepository(prisma),
  });
  await app.register(catalog.routes, { prefix: "/books" });

  const lending = createLendingModule({
    generateId,
    clock,
    repository: createPrismaLoanRepository(prisma),
    /* lending's port, satisfied by catalog's public API */
    bookCatalog: { getBookStatus: catalog.getBookStatus },
  });
  await app.register(lending.routes, { prefix: "/loans" });

  return app;
};
