import type { Loan, LoanStatus } from "../../domain/loan.js";

export type LoanFilter = {
  memberId?: string;
  status?: LoanStatus;
};

/** Declared by the application layer, implemented in `infra`. */
export type LoanRepository = {
  findById: (id: string) => Promise<Loan | null>;
  /**
   * Atomically, per Member: loads the Member's `active` Loans, lets `decide` (the domain
   * rules) build the new Loan from them, and stores it. Concurrent calls for the same
   * Member are serialized. Throws `BOOK_ALREADY_LOANED` if the Book already has an active Loan.
   */
  openLoan: (memberId: string, decide: (memberActiveLoans: Loan[]) => Loan) => Promise<Loan>;
  search: (filter: LoanFilter) => Promise<Loan[]>;
  /**
   * Stores a Loan the domain just gave back (`giveBack`), only if it is still `active` in the
   * database. Throws `LOAN_ALREADY_RETURNED` if a concurrent request returned it first.
   */
  markReturned: (loan: Loan) => Promise<Loan>;
};
