import type { Loan, LoanStatus } from "../../domain/loan.js";

export type LoanFilter = {
  memberId?: string;
  status?: LoanStatus;
};

export type LoanRepository = {
  findById: (id: string) => Promise<Loan | null>;
  /**
   * Atomically per Member (calls for the same Member are serialized): loads the Member's `active`
   * Loans, builds the new Loan with `create` (the domain rules; it must return a Loan of
   * `memberId`) and stores it. The per-Member rules hold only if every writer goes through here.
   * Throws `BOOK_ALREADY_LOANED` if the Book already has an active Loan (unique index).
   */
  openLoan: (memberId: string, create: (memberActiveLoans: Loan[]) => Loan) => Promise<Loan>;
  search: (filter: LoanFilter) => Promise<Loan[]>;
  /**
   * Stores a Loan the domain just gave back (`giveBack`), only if it is still `active` in the
   * database. Throws `LOAN_ALREADY_RETURNED` if a concurrent request returned it first.
   */
  markReturned: (loan: Loan) => Promise<Loan>;
};
