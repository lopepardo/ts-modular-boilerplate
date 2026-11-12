import { ConflictError } from "../../../shared/errors.js";

export type LoanStatus = "active" | "returned";

/** The stored shape of a Loan: what `rehydrateLoan` takes. */
export type LoanProps = Readonly<{
  id: string;
  bookId: string;
  memberId: string;
  status: LoanStatus;
  borrowedAt: Temporal.Instant;
  dueDate: Temporal.Instant;
}>;

declare const checked: unique symbol; // not exported: only this file can brand a Loan

/** The lending of a Book to a Member. Only `borrow` and `rehydrateLoan` create one. */
export type Loan = LoanProps & { readonly [checked]: true };

/** A Loan is due this many days after it starts. */
export const LOAN_PERIOD_DAYS = 14;

/** A Member can hold at most this many `active` Loans at once. */
export const MAX_ACTIVE_LOANS = 3;

/** Overdue: an `active` Loan whose DueDate has passed. Derived, never stored. */
export const isOverdue = (loan: Loan, now: Temporal.Instant): boolean => {
  return loan.status === "active" && Temporal.Instant.compare(now, loan.dueDate) > 0;
};

/**
 * Starts an `active` Loan due `LOAN_PERIOD_DAYS` after `now`. Refuses a Member whose
 * `memberActiveLoans` include an Overdue one or reach `MAX_ACTIVE_LOANS`.
 */
export const borrow = (
  input: { id: string; bookId: string; memberId: string; now: Temporal.Instant },
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
    dueDate: input.now.add({ hours: LOAN_PERIOD_DAYS * 24 }),
  } as Loan;
};

/** Only an `active` Loan can be returned; `returned` is final. */
export const giveBack = (loan: Loan): Loan => {
  if (loan.status === "returned") {
    throw new ConflictError("LOAN_ALREADY_RETURNED", `Loan ${loan.id} is already returned`);
  }
  return { ...loan, status: "returned" };
};

/** Rebuilds a stored Loan without re-applying the rules. For `infra` only. */
export const rehydrateLoan = (props: LoanProps): Loan => props as Loan;
