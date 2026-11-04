import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

import type { Expense } from "../repositories/expenses.js";
import type { ExpensesService } from "../services/expenses.js";

const ParamsSchema = z.object({ id: z.uuid() });
const dateSchema = z.iso
  .date()
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

const present = (expense: Expense) => ({
  id: expense.id,
  amountCents: expense.amountCents,
  description: expense.description,
  category: expense.category,
  date: expense.date.toISOString().slice(0, 10),
  createdAt: expense.createdAt.toISOString(),
});

const NewExpenseSchema = z.object({
  amountCents: z.number().int().positive(),
  description: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(50),
  date: dateSchema,
});

const FiltersSchema = z.object({
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  category: z.string().trim().min(1).optional(),
});

const SummaryQuerySchema = z
  .object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) })
  .transform(({ month }) => {
    const from = new Date(`${month}-01T00:00:00.000Z`);
    const to = new Date(from);
    to.setUTCMonth(to.getUTCMonth() + 1);
    return { month, from, to };
  });

export const createExpensesController = (service: ExpensesService) => ({
  createExpense: async (request: FastifyRequest, reply: FastifyReply) => {
    const data = NewExpenseSchema.parse(request.body);
    const expense = await service.createExpense(data);
    return reply.code(201).send(present(expense));
  },

  listExpenses: async (request: FastifyRequest) => {
    const filters = FiltersSchema.parse(request.query);
    const expenses = await service.listExpenses({
      ...(filters.from && { from: filters.from }),
      ...(filters.to && { to: filters.to }),
      ...(filters.category && { category: filters.category }),
    });
    return expenses.map(present);
  },

  getSummary: async (request: FastifyRequest) => {
    const { month, from, to } = SummaryQuerySchema.parse(request.query);
    request.log.info({ month, from, to }, "Getting summary for month");
    const summary = await service.getMonthlySummary({ from, to });
    return { month, ...summary };
  },

  getExpense: async (request: FastifyRequest) => {
    const { id } = ParamsSchema.parse(request.params);
    return present(await service.getExpense(id));
  },

  deleteExpense: async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = ParamsSchema.parse(request.params);
    await service.deleteExpense(id);
    return reply.code(204).send();
  },
});
