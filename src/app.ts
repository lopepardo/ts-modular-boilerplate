import type { PrismaClient } from "./platform/db/client.js";
import { createServer, type ServerConfig } from "./platform/http/createServer.js";
import { uuidGenerator, type IdGenerator } from "./shared/ids.js";
import {
  createCatalogModule,
  createPrismaBookRepository,
  type BookRepository,
} from "./modules/catalog/index.js";

export type AppDeps = {
  config: ServerConfig;
  prisma: PrismaClient;
  generateId?: IdGenerator;
  /** Per-module overrides (tests): anything omitted uses the real thing. */
  catalog?: { repository?: BookRepository };
};

/**
 * Composition root (ADR 0002): wires modules to their infrastructure.
 * `_template` is deliberately not mounted: it is a copy-me example.
 */
export const buildApp = async (deps: AppDeps) => {
  const { config, prisma, generateId = uuidGenerator } = deps;
  const app = await createServer(config);

  const catalog = createCatalogModule({
    repository: deps.catalog?.repository ?? createPrismaBookRepository(prisma),
    generateId,
  });
  await app.register(catalog.routes, { prefix: "/books" });

  return app;
};
