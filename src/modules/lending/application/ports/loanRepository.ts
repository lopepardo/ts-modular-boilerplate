import type { Loan } from "../../domain/loan.js";

/** Declared by the application layer, implemented in `infra`. */
export type LoanRepository = {
  save: (loan: Loan) => Promise<Loan>;
};
