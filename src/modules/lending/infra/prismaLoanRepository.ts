import { ConflictError } from "../../../shared/errors.js";
import { Prisma, type PrismaClient } from "../../../platform/db/generated/client.js";
import type { LoanRepository } from "../application/ports/loanRepository.js";
import { dueDateAt } from "../domain/dueDate.js";
import type { Loan } from "../domain/loan.js";

/** Only touches the `Loan` table owned by this module. */
export const createPrismaLoanRepository = (prisma: PrismaClient): LoanRepository => {
  const toLoan = (row: Omit<Loan, "dueDate"> & { dueDate: Date }): Loan => ({
    ...row,
    dueDate: dueDateAt(row.dueDate),
  });

  return {
    openLoan: async (memberId, decide) => {
      try {
        const row = await prisma.$transaction(async (tx) => {
          // Serializes this Member's borrowings; the lock is released when the transaction ends.
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${memberId}))`;
          const active = await tx.loan.findMany({ where: { memberId, status: "active" } });
          const loan = decide(active.map(toLoan));
          return tx.loan.create({
            data: {
              id: loan.id,
              bookId: loan.bookId,
              memberId: loan.memberId,
              status: loan.status,
              borrowedAt: loan.borrowedAt,
              dueDate: loan.dueDate.value,
            },
          });
        });
        return toLoan(row);
      } catch (error) {
        // Partial unique index `Loan_one_active_per_book`: another request got the Book first.
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          throw new ConflictError("BOOK_ALREADY_LOANED", "Book already has an active loan", {
            cause: error,
          });
        }
        throw error;
      }
    },
    findById: async (id: string) => {
      const row = await prisma.loan.findUnique({ where: { id } });
      return row && toLoan(row);
    },
    search: async ({ memberId, status }) => {
      const rows = await prisma.loan.findMany({
        where: {
          ...(memberId !== undefined && { memberId }),
          ...(status !== undefined && { status }),
        },
        orderBy: [{ borrowedAt: "asc" }, { id: "asc" }],
      });
      return rows.map(toLoan);
    },
    markReturned: async (loan: Loan) => {
      // Conditional update: of two concurrent returns, only one finds the Loan still `active`.
      const { count } = await prisma.loan.updateMany({
        where: { id: loan.id, status: "active" },
        data: { status: "returned" },
      });
      if (count === 0) {
        throw new ConflictError("LOAN_ALREADY_RETURNED", `Loan ${loan.id} is already returned`);
      }
      return loan;
    },
  };
};
