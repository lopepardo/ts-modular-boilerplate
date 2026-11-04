import type {
  Expense,
  ExpensesRepository,
} from "../../src/repositories/expenses.js";
import type { Clock } from "../../src/shared/clock.js";
import type { IdGenerator } from "../../src/shared/ids.js";

export const createInMemoryExpensesRepository = ({
  clock,
  generateId,
}: {
  clock: Clock;
  generateId: IdGenerator;
}): ExpensesRepository => {
  const store = new Map<string, Expense>();

  return {
    create: async (data) => {
      const expense = { ...data, id: generateId(), createdAt: clock.now() };
      store.set(expense.id, expense);
      return expense;
    },
    list: async () => [...store.values()],
    findById: async (id) => store.get(id) ?? null,
    deleteById: async (id) => store.delete(id),
    totalsByCategory: async () => [],
  };
};
