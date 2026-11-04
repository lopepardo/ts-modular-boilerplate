import type { FastifyPluginAsync } from "fastify";

import { createExpensesController } from "../controllers/expenses.js";
import type { ExpensesService } from "../services/expenses.js";

export const expensesRoutes =
  (service: ExpensesService): FastifyPluginAsync =>
  async (app) => {
    const controller = createExpensesController(service);

    app.post("/", controller.createExpense);
    app.get("/", controller.listExpenses);
    app.get("/summary", controller.getSummary);
    app.get("/:id", controller.getExpense);
    app.delete("/:id", controller.deleteExpense);
  };
