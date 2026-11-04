import type {
  ExpenseFilters,
  ExpensesRepository,
  NewExpense,
} from "../repositories/expenses.js";
import { NotFoundError } from "../shared/errors.js";

export type { ExpenseFilters, NewExpense };

export type MonthlySummary = {
  totalCents: number;
  count: number;
  categories: { category: string; totalCents: number; count: number }[];
};

export type ExpensesService = ReturnType<typeof createExpensesService>;

const notFound = (id: string) =>
  new NotFoundError("EXPENSE_NOT_FOUND", `Expense ${id} not found`);

export const createExpensesService = (repository: ExpensesRepository) => ({
  createExpense: (data: NewExpense) => repository.create(data),

  listExpenses: (filters: ExpenseFilters) => repository.list(filters),

  getMonthlySummary: async (range: {
    from: Date;
    to: Date;
  }): Promise<MonthlySummary> => {
    const categories = (await repository.totalsByCategory(range)).sort(
      (a, b) =>
        b.totalCents - a.totalCents || a.category.localeCompare(b.category),
    );
    return {
      totalCents: categories.reduce((sum, c) => sum + c.totalCents, 0),
      count: categories.reduce((sum, c) => sum + c.count, 0),
      categories,
    };
  },

  getExpense: async (id: string) => {
    const expense = await repository.findById(id);
    if (!expense) throw notFound(id);
    return expense;
  },

  deleteExpense: async (id: string) => {
    if (!(await repository.deleteById(id))) throw notFound(id);
  },
});
