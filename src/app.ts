import Fastify from "fastify";
import cors from "@fastify/cors";
import { validatorCompiler } from "fastify-type-provider-zod";

import { env } from "./platform/config/env.js";
import { prisma } from "./platform/db/client.js";
import { errorHandler } from "./platform/http/errorHandler.js";
import { notFoundHandler } from "./platform/http/notFoundHandler.js";
import { buildLoggerOptions } from "./platform/logging/logger.js";

import { systemClock, type Clock } from "./shared/clock.js";
import { uuidGenerator, type IdGenerator } from "./shared/ids.js";
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

  const app = Fastify({
    logger: buildLoggerOptions(env),
  });

  // Zod validates requests from each route's `schema`.
  app.setValidatorCompiler(validatorCompiler);
  // app.setSerializerCompiler(serializerCompiler);

  // TODO: OpenAPI docs: register @fastify/swagger with
  // `transform: jsonSchemaTransform` (fastify-type-provider-zod) before routes,
  // and declare `response` schemas (success + errors) on each route.

  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler(notFoundHandler);

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
