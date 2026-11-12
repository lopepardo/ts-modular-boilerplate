import { ConflictError } from "../../../shared/errors.js";
import { Prisma, type PrismaClient } from "../../../platform/db/generated/client.js";
import type { LoanRepository } from "../application/ports/loanRepository.js";
import { rehydrateLoan, type Loan, type LoanStatus } from "../domain/loan.js";

type LoanRow = {
  id: string;
  bookId: string;
  memberId: string;
  status: LoanStatus;
  borrowedAt: Date;
  dueDate: Date;
};

export const createPrismaLoanRepository = (prisma: PrismaClient): LoanRepository => {
  const toLoan = (row: LoanRow): Loan => {
    return rehydrateLoan({
      ...row,
      borrowedAt: row.borrowedAt.toTemporalInstant(),
      dueDate: row.dueDate.toTemporalInstant(),
    });
  };
  const toDate = (instant: Temporal.Instant) => new Date(instant.epochMilliseconds);

  return {
    openLoan: async (memberId, create) => {
      try {
        const row = await prisma.$transaction(async (tx) => {
          // Serializes this Member's borrowings until the transaction ends. Relies on READ
          // COMMITTED (the default) so the read below sees the previous holder's commit.
          // Advisory locks are shared by the whole database: the first key namespaces this one.
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('lending.member'), hashtext(${memberId}))`;
          const active = await tx.loan.findMany({ where: { memberId, status: "active" } });
          const memberActiveLoans = active.map(toLoan);
          const loan = create(memberActiveLoans);

          return tx.loan.create({
            data: {
              id: loan.id,
              bookId: loan.bookId,
              memberId: loan.memberId,
              status: loan.status,
              borrowedAt: toDate(loan.borrowedAt),
              dueDate: toDate(loan.dueDate),
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
