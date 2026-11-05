import cors from "@fastify/cors";
import Fastify from "fastify";
import { validatorCompiler } from "fastify-type-provider-zod";

import type { AppConfig } from "../config/env.js";
import { buildLoggerOptions } from "../logging/logger.js";
import { errorHandler } from "./errorHandler.js";
import { notFoundHandler } from "./notFoundHandler.js";

export type ServerConfig = Pick<AppConfig, "APP_NAME" | "APP_ENV" | "LOG_LEVEL">;

/** Fastify with the cross-cutting setup only: it knows nothing about modules. */
export const createServer = async (config: ServerConfig) => {
  const app = Fastify({
    logger: buildLoggerOptions(config),
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

  return app;
};
