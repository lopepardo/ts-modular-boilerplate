import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  createExpense as createExpenseService,
  deleteExpense as deleteExpenseService,
  getExpense as getExpenseService,
  getMonthlySummary as getMonthlySummaryService,
  listExpenses as listExpensesService,
} from "../services/expenses.js";

const ParamsSchema = z.object({ id: z.uuid() });
const dateSchema = z.iso
  .date()
  .transform((value) => new Date(`${value}T00:00:00.000Z`));
type ExpenseRow = Awaited<ReturnType<typeof getExpenseService>>;

const present = (expense: ExpenseRow) => ({
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
export const createExpense = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const data = NewExpenseSchema.parse(request.body);
  const expense = await createExpenseService(data);
  return reply.code(201).send(present(expense));
};

const FiltersSchema = z.object({
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  category: z.string().trim().min(1).optional(),
});
export const listExpenses = async (request: FastifyRequest) => {
  const filters = FiltersSchema.parse(request.query);
  const expenses = await listExpensesService({
    ...(filters.from && { from: filters.from }),
    ...(filters.to && { to: filters.to }),
    ...(filters.category && { category: filters.category }),
  });
  return expenses.map(present);
};

const SummaryQuerySchema = z
  .object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) })
  .transform(({ month }) => {
    const from = new Date(`${month}-01T00:00:00.000Z`);
    const to = new Date(from);
    to.setUTCMonth(to.getUTCMonth() + 1);
    return { month, from, to };
  });
export const getSummary = async (request: FastifyRequest) => {
  const { month, from, to } = SummaryQuerySchema.parse(request.query);
  request.log.info({ month, from, to }, "Getting summary for month");
  const summary = await getMonthlySummaryService({ from, to });
  return { month, ...summary };
};

export const getExpense = async (request: FastifyRequest) => {
  const { id } = ParamsSchema.parse(request.params);
  return present(await getExpenseService(id));
};

export const deleteExpense = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const { id } = ParamsSchema.parse(request.params);
  await deleteExpenseService(id);
  return reply.code(204).send();
};
