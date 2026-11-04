import type { PrismaClient } from "../platform/db/generated/client.js";

export type Expense = {
  id: string;
  amountCents: number;
  description: string;
  category: string;
  date: Date;
  createdAt: Date;
};

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

export type CategoryTotal = {
  category: string;
  totalCents: number;
  count: number;
};

export type ExpensesRepository = {
  create: (data: NewExpense) => Promise<Expense>;
  list: (filters: ExpenseFilters) => Promise<Expense[]>;
  findById: (id: string) => Promise<Expense | null>;
  /** Returns whether an expense was deleted. */
  deleteById: (id: string) => Promise<boolean>;
  totalsByCategory: (range: {
    from: Date;
    to: Date;
  }) => Promise<CategoryTotal[]>;
};

/** Prisma-backed implementation (id and createdAt come from DB defaults). */
export const createPrismaExpensesRepository = (
  prisma: PrismaClient,
): ExpensesRepository => ({
  create: (data) => prisma.expense.create({ data }),

  list: ({ from, to, category }) =>
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
    }),

  findById: (id) => prisma.expense.findUnique({ where: { id } }),

  deleteById: async (id) => {
    const { count } = await prisma.expense.deleteMany({ where: { id } });
    return count > 0;
  },

  totalsByCategory: async ({ from, to }) => {
    const groups = await prisma.expense.groupBy({
      by: ["category"],
      where: { date: { gte: from, lt: to } },
      _sum: { amountCents: true },
      _count: { _all: true },
    });
    return groups.map((group) => ({
      category: group.category,
      totalCents: group._sum.amountCents ?? 0,
      count: group._count._all,
    }));
  },
});
