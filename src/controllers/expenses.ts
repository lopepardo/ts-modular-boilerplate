import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  createExpense as createExpenseService,
  deleteExpense as deleteExpenseService,
  getExpense as getExpenseService,
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
