import { ConflictError } from "../../../shared/errors.js";
import { dueDateFrom, type DueDate } from "./dueDate.js";

export type LoanStatus = "active" | "returned";

/** The lending of a Book to a Member (see `CONTEXT.md`). */
export type Loan = {
  id: string;
  bookId: string;
  memberId: string;
  status: LoanStatus;
  borrowedAt: Date;
  dueDate: DueDate;
};

/** A Member can hold at most this many `active` Loans at once. */
export const MAX_ACTIVE_LOANS = 3;

/** Overdue: an `active` Loan whose DueDate has passed. Derived, never stored. */
export const isOverdue = (loan: Loan, now: Date): boolean =>
  loan.status === "active" && now.getTime() > loan.dueDate.value.getTime();

/**
 * Starts a Loan: always `active`, due 14 days after `now`. `memberActiveLoans` are the
 * Member's current `active` Loans; the Member must have none Overdue and fewer than the limit.
 */
export const borrow = (
  input: { id: string; bookId: string; memberId: string; now: Date },
  memberActiveLoans: readonly Loan[],
): Loan => {
  if (memberActiveLoans.some((loan) => isOverdue(loan, input.now))) {
    throw new ConflictError(
      "MEMBER_HAS_OVERDUE_LOANS",
      `Member ${input.memberId} has overdue loans and cannot borrow`,
    );
  }
  if (memberActiveLoans.length >= MAX_ACTIVE_LOANS) {
    throw new ConflictError(
      "LOAN_LIMIT_REACHED",
      `Member ${input.memberId} already has ${MAX_ACTIVE_LOANS} active loans`,
    );
  }
  return {
    id: input.id,
    bookId: input.bookId,
    memberId: input.memberId,
    status: "active",
    borrowedAt: input.now,
    dueDate: dueDateFrom(input.now),
  };
};

/** Gives a Loan back: only an `active` Loan can be returned, and there is no way back. */
export const giveBack = (loan: Loan): Loan => {
  if (loan.status === "returned") {
    throw new ConflictError("LOAN_ALREADY_RETURNED", `Loan ${loan.id} is already returned`);
  }
  return { ...loan, status: "returned" };
};
