import { describe, expect, it } from "vitest";

import {
  borrow,
  giveBack,
  isOverdue,
  MAX_ACTIVE_LOANS,
  rehydrateLoan,
  type Loan,
  type LoanProps,
} from "../../src/modules/lending/domain/loan.js";
import { ConflictError } from "../../src/shared/errors.js";

// Pure domain tests (no database, no HTTP); end-to-end behavior is in tests/lending.test.ts.

const NOW = Temporal.Instant.from("2026-03-01T10:00:00Z");
const daysAfter = (instant: Temporal.Instant, days: number) => instant.add({ hours: days * 24 });

let counter = 0;
/** A new `active` Loan of `memberId`, borrowed at `at`, through the real rules. */
const activeLoan = (at = NOW, memberId = "member-1"): Loan =>
  borrow({ id: `loan-${++counter}`, bookId: `book-${counter}`, memberId, now: at }, []);

const borrowWith = (memberActiveLoans: Loan[], now = NOW) =>
  borrow({ id: "new-loan", bookId: "new-book", memberId: "member-1", now }, memberActiveLoans);

/** The `code` of the ConflictError a call throws. */
const conflictCode = (action: () => unknown): string => {
  try {
    action();
  } catch (error) {
    if (error instanceof ConflictError) return error.code;
    throw error;
  }
  throw new Error("expected a ConflictError, nothing was thrown");
};

describe("borrow", () => {
  it("creates an active Loan borrowed now and due exactly 14 days later", () => {
    const loan = borrow({ id: "loan-a", bookId: "book-a", memberId: "member-a", now: NOW }, []);

    expect(loan).toMatchObject({
      id: "loan-a",
      bookId: "book-a",
      memberId: "member-a",
      status: "active",
      borrowedAt: NOW,
      dueDate: daysAfter(NOW, 14),
    });
  });

  it("allows a Member below the limit", () => {
    const loans = Array.from({ length: MAX_ACTIVE_LOANS - 1 }, () => activeLoan());

    expect(borrowWith(loans).status).toBe("active");
  });

  it("refuses a Member who already holds the maximum of active Loans", () => {
    const loans = Array.from({ length: MAX_ACTIVE_LOANS }, () => activeLoan());

    expect(conflictCode(() => borrowWith(loans))).toBe("LOAN_LIMIT_REACHED");
  });

  it("refuses a Member with an Overdue Loan, even below the limit", () => {
    const old = activeLoan(daysAfter(NOW, -30));

    expect(conflictCode(() => borrowWith([old]))).toBe("MEMBER_HAS_OVERDUE_LOANS");
  });

  it("reports the Overdue Loan first when the Member is also at the limit", () => {
    const loans = [activeLoan(daysAfter(NOW, -30)), activeLoan(), activeLoan()];
    expect(loans).toHaveLength(MAX_ACTIVE_LOANS);

    expect(conflictCode(() => borrowWith(loans))).toBe("MEMBER_HAS_OVERDUE_LOANS");
  });

  it("does not treat a Loan due exactly now as Overdue", () => {
    const dueNow = activeLoan(daysAfter(NOW, -14));

    expect(borrowWith([dueNow]).status).toBe("active");
  });
});

describe("isOverdue", () => {
  it("flips one millisecond after the DueDate", () => {
    const loan = activeLoan();

    expect(isOverdue(loan, loan.dueDate)).toBe(false);
    expect(isOverdue(loan, loan.dueDate.add({ milliseconds: 1 }))).toBe(true);
  });

  it("is never true for a returned Loan, however late", () => {
    const returned = giveBack(activeLoan());

    expect(isOverdue(returned, daysAfter(NOW, 365))).toBe(false);
  });
});

describe("giveBack", () => {
  it("returns a new returned Loan and leaves the original untouched", () => {
    const loan = activeLoan();

    const returned = giveBack(loan);

    expect(returned).not.toBe(loan);
    expect(loan.status).toBe("active");
    expect(returned).toMatchObject({
      id: loan.id,
      bookId: loan.bookId,
      memberId: loan.memberId,
      status: "returned",
      borrowedAt: loan.borrowedAt,
      dueDate: loan.dueDate,
    });
  });

  it("refuses to give back a returned Loan: there is no way back", () => {
    const returned = giveBack(activeLoan());

    expect(conflictCode(() => giveBack(returned))).toBe("LOAN_ALREADY_RETURNED");
  });
});

describe("rehydrateLoan", () => {
  it("rebuilds a stored Loan as is, without applying the borrowing rules", () => {
    const stored = activeLoan(daysAfter(NOW, -30));

    const rebuilt = rehydrateLoan({ ...stored });

    expect(rebuilt).toEqual(stored);
    expect(isOverdue(rebuilt, NOW)).toBe(true);
  });
});

// Compile-time guarantees, checked by `pnpm typecheck`; never called.
export const loanTypeGuarantees = (loan: Loan, props: LoanProps) => {
  // @ts-expect-error a Loan cannot be written by hand: it needs the brand from `borrow`
  const forged: Loan = { ...props };
  // @ts-expect-error a Loan is readonly
  loan.status = "returned";
  return forged;
};
