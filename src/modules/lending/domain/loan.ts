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

/** Starts a Loan: always `active`, due 14 days after `now`. */
export const borrow = (input: {
  id: string;
  bookId: string;
  memberId: string;
  now: Date;
}): Loan => ({
  id: input.id,
  bookId: input.bookId,
  memberId: input.memberId,
  status: "active",
  borrowedAt: input.now,
  dueDate: dueDateFrom(input.now),
});

/** Gives a Loan back: only an `active` Loan can be returned, and there is no way back. */
export const giveBack = (loan: Loan): Loan => {
  if (loan.status === "returned") {
    throw new ConflictError("LOAN_ALREADY_RETURNED", `Loan ${loan.id} is already returned`);
  }
  return { ...loan, status: "returned" };
};
