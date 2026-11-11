import { isOverdue, type Loan } from "../domain/loan.js";
import type { LoanResponse } from "./schemas.js";

/** Maps the domain entity to the public DTO. `now` comes from the injected clock. */
export const presentLoan = (loan: Loan, now: Temporal.Instant): LoanResponse => ({
  id: loan.id,
  bookId: loan.bookId,
  memberId: loan.memberId,
  status: loan.status,
  overdue: isOverdue(loan, now),
  borrowedAt: loan.borrowedAt.toString({ smallestUnit: "millisecond" }),
  dueDate: loan.dueDate.toString({ smallestUnit: "millisecond" }),
});
