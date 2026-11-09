# 08: Lending: borrowing rules

**What to build:** Borrowing enforces the remaining rules from `CONTEXT.md`: a Book has at most one `active` Loan; a Member has at most 3 `active` Loans, and returned Loans do not count; a Member with any **Overdue** Loan cannot borrow. Overdue is derived from the DueDate and the injected clock, never stored, so advancing the fixed clock past a DueDate makes the Loan Overdue.

**Concurrency (ADR 0003/0004):** the checks must hold under concurrent requests. One active Loan per Book is already guaranteed by the `Loan_one_active_per_book` partial unique index (translate its violation to the 409 business error). The 3-loan and Overdue rules need a per-Member atomic operation in `LoanRepository` (a transaction plus `pg_advisory_xact_lock` on `memberId`); the rules themselves stay in the domain. No cross-module transaction.

**Blocked by:** 07

**Status:** ready-for-agent

- [ ] Borrowing a book that already has an active loan is refused with a 409 business error
- [ ] A member's fourth simultaneous active loan is refused with a 409 business error
- [ ] Returning a loan frees a slot so the member can borrow again up to the limit
- [ ] After advancing the clock past a loan's DueDate, that member cannot borrow another book (409) until the overdue loan is returned
- [ ] A member with only returned loans, or only non-overdue active loans, can borrow normally
- [ ] Scenarios pass against the real Postgres (`pnpm test`)
- [ ] `pnpm typecheck && pnpm lint && pnpm test` pass
