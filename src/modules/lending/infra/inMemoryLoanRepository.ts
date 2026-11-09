import type { LoanRepository } from "../application/ports/loanRepository.js";
import type { Loan } from "../domain/loan.js";

export const createInMemoryLoanRepository = (): LoanRepository => {
  const store = new Map<string, Loan>();

  return {
    save: async (loan) => {
      store.set(loan.id, loan);
      return loan;
    },
  };
};
