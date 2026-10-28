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

export type MonthlySummary = {
  totalCents: number;
  count: number;
  categories: { category: string; totalCents: number; count: number }[];
};

export const getMonthlySummary = async ({
  from,
  to,
}: {
  from: Date;
  to: Date;
}): Promise<MonthlySummary> => {
  const groups = await prisma.expense.groupBy({
    by: ["category"],
    where: { date: { gte: from, lt: to } },
    _sum: { amountCents: true },
    _count: { _all: true },
  });
  const categories = groups
    .map((group) => ({
      category: group.category,
      totalCents: group._sum.amountCents ?? 0,
      count: group._count._all,
    }))
    .sort(
      (a, b) =>
        b.totalCents - a.totalCents || a.category.localeCompare(b.category),
    );
  return {
    totalCents: categories.reduce((sum, c) => sum + c.totalCents, 0),
    count: categories.reduce((sum, c) => sum + c.count, 0),
    categories,
  };
};

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
