import { isOverdue, type Loan } from "../domain/loan.js";
import type { LoanResponse } from "./schemas.js";

/** Maps the domain entity to the public DTO. `now` comes from the injected clock. */
export const presentLoan = (loan: Loan, now: Date): LoanResponse => ({
  id: loan.id,
  bookId: loan.bookId,
  memberId: loan.memberId,
  status: loan.status,
  overdue: isOverdue(loan, now),
  borrowedAt: loan.borrowedAt.toISOString(),
  dueDate: loan.dueDate.value.toISOString(),
});
