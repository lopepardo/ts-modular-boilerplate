import type { Loan, LoanStatus } from "../../domain/loan.js";

export type LoanFilter = {
  memberId?: string;
  status?: LoanStatus;
};

/** Declared by the application layer, implemented in `infra`. */
export type LoanRepository = {
  findById: (id: string) => Promise<Loan | null>;
  /**
   * Atomically, per Member: loads the Member's `active` Loans, builds the new Loan with `create`
   * (the domain rules) and stores it; calls for the same Member are serialized. Throws
   * `BOOK_ALREADY_LOANED` if the Book already has an active Loan.
   *
   * - `create` must return a Loan of `memberId`: only that Member is locked.
   * - The only way to create a Loan: the per-Member rules hold only if every writer goes through
   *   here (one active Loan per Book is enforced by a unique index instead).
   */
  openLoan: (memberId: string, create: (memberActiveLoans: Loan[]) => Loan) => Promise<Loan>;
  search: (filter: LoanFilter) => Promise<Loan[]>;
  /**
   * Stores a Loan the domain just gave back (`giveBack`), only if it is still `active` in the
   * database. Throws `LOAN_ALREADY_RETURNED` if a concurrent request returned it first.
   */
  markReturned: (loan: Loan) => Promise<Loan>;
};
