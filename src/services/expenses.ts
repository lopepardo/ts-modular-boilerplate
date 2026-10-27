import { prisma } from "../db/client.js";
import { AppError } from "../shared/AppError.js";

export type NewExpense = {
  amountCents: number;
  description: string;
  category: string;
  date: Date;
};

export type ExpenseFilters = {
  from?: Date;
  to?: Date;
  category?: string;
};

export const createExpense = (data: NewExpense) =>
  prisma.expense.create({ data });

export const listExpenses = ({ from, to, category }: ExpenseFilters) =>
  prisma.expense.findMany({
    where: {
      ...(category !== undefined && { category }),
      ...((from !== undefined || to !== undefined) && {
        date: {
          ...(from !== undefined && { gte: from }),
          ...(to !== undefined && { lte: to }),
        },
      }),
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

export const getExpense = async (id: string) => {
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) {
    throw new AppError(`Expense ${id} not found`, 404, "EXPENSE_NOT_FOUND");
  }
  return expense;
};

export const deleteExpense = async (id: string) => {
  const { count } = await prisma.expense.deleteMany({ where: { id } });
  if (count === 0) {
    throw new AppError(`Expense ${id} not found`, 404, "EXPENSE_NOT_FOUND");
  }
};
