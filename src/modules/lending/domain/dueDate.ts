const LOAN_PERIOD_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The return deadline of a Loan (see `CONTEXT.md`): a value, compared by its date. */
export type DueDate = { readonly value: Date };

/** The DueDate of a Loan created at `createdAt`: 14 days later. */
export const dueDateFrom = (createdAt: Date): DueDate => ({
  value: new Date(createdAt.getTime() + LOAN_PERIOD_DAYS * DAY_MS),
});

/** Rebuilds a DueDate already stored. */
export const dueDateAt = (value: Date): DueDate => ({ value });
