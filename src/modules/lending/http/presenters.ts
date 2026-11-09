import type { Loan } from "../domain/loan.js";
import type { LoanResponse } from "./schemas.js";

/** Maps the domain entity to the public DTO. */
export const presentLoan = (loan: Loan): LoanResponse => ({
  id: loan.id,
  bookId: loan.bookId,
  memberId: loan.memberId,
  status: loan.status,
  borrowedAt: loan.borrowedAt.toISOString(),
  dueDate: loan.dueDate.value.toISOString(),
});
