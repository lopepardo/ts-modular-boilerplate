import type { Loan } from "../../domain/loan.js";

/** Declared by the application layer, implemented in `infra`. */
export type LoanRepository = {
  findById: (id: string) => Promise<Loan | null>;
  /**
   * Atomically, per Member: loads the Member's `active` Loans, lets `decide` (the domain
   * rules) build the new Loan from them, and stores it. Concurrent calls for the same
   * Member are serialized. Throws `BOOK_ALREADY_LOANED` if the Book already has an active Loan.
   */
  openLoan: (memberId: string, decide: (memberActiveLoans: Loan[]) => Loan) => Promise<Loan>;
  save: (loan: Loan) => Promise<Loan>;
};
