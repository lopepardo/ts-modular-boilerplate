import type { PrismaClient } from "./platform/db/client.js";
import { createServer, type ServerConfig } from "./platform/http/createServer.js";

import { systemClock, type Clock } from "./shared/clock.js";
import { uuidGenerator, type IdGenerator } from "./shared/ids.js";

import {
  createCatalogModule,
  createPrismaBookRepository,
  type BookRepository,
} from "./modules/catalog/index.js";
import {
  createLendingModule,
  createPrismaLoanRepository,
  type LoanRepository,
} from "./modules/lending/index.js";

export type AppDeps = {
  /* Shared (cross-cutting) infrastructure: one property per port/client */
  config: ServerConfig;
  prisma: PrismaClient;
  generateId?: IdGenerator;
  clock?: Clock;

  /** Per-module overrides (tests): anything omitted uses the real thing. */
  catalog?: { repository?: BookRepository };
  lending?: { repository?: LoanRepository };
};

/**
 * Composition root (ADR 0002): wires modules to their infrastructure.
 * `_template` is deliberately not mounted: it is a copy-me example.
 */
export const buildApp = async (deps: AppDeps) => {
  const { config, prisma, generateId = uuidGenerator, clock = systemClock } = deps;

  const app = await createServer(config);

  /* Modules */
  const catalog = createCatalogModule({
    repository: deps.catalog?.repository ?? createPrismaBookRepository(prisma),
    generateId,
  });
  await app.register(catalog.routes, { prefix: "/books" });

  const lending = createLendingModule({
    repository: deps.lending?.repository ?? createPrismaLoanRepository(prisma),
    /* lending's port, satisfied by catalog's public API */
    bookCatalog: { getBookStatus: catalog.getBookStatus },
    generateId,
    clock,
  });
  await app.register(lending.routes, { prefix: "/loans" });

  return app;
};
