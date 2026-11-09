import type { PrismaClient } from "../../../platform/db/generated/client.js";
import type { LoanRepository } from "../application/ports/loanRepository.js";
import { dueDateAt } from "../domain/dueDate.js";
import type { Loan } from "../domain/loan.js";

/** Only touches the `Loan` table owned by this module (ADR 0003). */
export const createPrismaLoanRepository = (prisma: PrismaClient): LoanRepository => {
  return {
    save: async (loan: Loan) => {
      const data = {
        bookId: loan.bookId,
        memberId: loan.memberId,
        status: loan.status,
        borrowedAt: loan.borrowedAt,
        dueDate: loan.dueDate.value,
      };
      const row = await prisma.loan.upsert({
        where: { id: loan.id },
        create: { id: loan.id, ...data },
        update: data,
      });
      return { ...row, dueDate: dueDateAt(row.dueDate) };
    },
  };
};
