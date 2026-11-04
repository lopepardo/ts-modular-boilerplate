import cors from "@fastify/cors";
import type { FastifyInstance } from "fastify";

import { errorHandler } from "./errorHandler.js";

export const registerHttpPlugins = async (app: FastifyInstance) => {
  app.setErrorHandler(errorHandler);
  await app.register(cors, { origin: "*" });
  app.get("/health", async (_request, _reply) => ({ status: "ok" }));
};
