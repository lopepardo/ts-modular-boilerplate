import type { FastifyPluginAsync } from "fastify";
import {
  createExpense,
  deleteExpense,
  getExpense,
  getSummary,
  listExpenses,
} from "../controllers/expenses.js";

export const expensesRoutes: FastifyPluginAsync = async (app) => {
  app.post("/", createExpense);
  app.get("/", listExpenses);
  app.get("/summary", getSummary);
  app.get("/:id", getExpense);
  app.delete("/:id", deleteExpense);
};
