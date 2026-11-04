import Fastify from "fastify";
import cors from "@fastify/cors";

import { systemClock, type Clock } from "./shared/clock.js";
import { uuidGenerator, type IdGenerator } from "./shared/ids.js";
import { prisma } from "./platform/db/client.js";
import { errorHandler } from "./platform/http/errorHandler.js";
import {
  createCatalogModule,
  createPrismaBookRepository,
  type BookRepository,
} from "./modules/catalog/index.js";
import {
  createInMemoryExampleRepository,
  createTemplateModule,
  type ExampleRepository,
} from "./modules/_template/index.js";

export type AppDependencies = {
  clock: Clock;
  generateId: IdGenerator;
  templateRepository: ExampleRepository;
  bookRepository: BookRepository;
};

/** Single composition root (ADR 0002): real dependencies unless overridden. */
export const buildApp = async (overrides: Partial<AppDependencies> = {}) => {
  const deps: AppDependencies = {
    clock: systemClock,
    generateId: uuidGenerator,
    templateRepository: createInMemoryExampleRepository(),
    bookRepository: createPrismaBookRepository(prisma),
    ...overrides,
  };

  const app = Fastify({ logger: true });

  app.setErrorHandler(errorHandler);

  await app.register(cors, { origin: "*" });

  app.get("/health", async (_request, _reply) => ({ status: "ok" }));

  const template = createTemplateModule({
    repository: deps.templateRepository,
    generateId: deps.generateId,
  });
  await app.register(template.routes, { prefix: "/_template" });

  const catalog = createCatalogModule({
    repository: deps.bookRepository,
    generateId: deps.generateId,
  });
  await app.register(catalog.routes, { prefix: "/books" });

  return app;
};
