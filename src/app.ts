import Fastify from "fastify";
import cors from "@fastify/cors";

import { errorHandler } from "./handlers/errorHandler.js";
import { expensesRoutes } from "./routes/expenses.js";

export const buildApp = async () => {
  const app = Fastify({ logger: true });

  app.setErrorHandler(errorHandler);
  await app.register(cors, {
    origin: "*",
  });

  app.register(expensesRoutes, { prefix: "/expenses" });

  return app;
};
