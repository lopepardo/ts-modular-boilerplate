# 08: Lending: borrowing rules

**What to build:** Borrowing enforces the remaining rules from `CONTEXT.md`: a Book has at most one `active` Loan; a Member has at most 3 `active` Loans, and returned Loans do not count; a Member with any **Overdue** Loan cannot borrow. Overdue is derived from the DueDate and the injected clock, never stored, so advancing the fixed clock past a DueDate makes the Loan Overdue.

**Blocked by:** 07

**Status:** ready-for-agent

- [ ] Borrowing a book that already has an active loan is refused with a 409 business error
- [ ] A member's fourth simultaneous active loan is refused with a 409 business error
- [ ] Returning a loan frees a slot so the member can borrow again up to the limit
- [ ] After advancing the clock past a loan's DueDate, that member cannot borrow another book (409) until the overdue loan is returned
- [ ] A member with only returned loans, or only non-overdue active loans, can borrow normally
- [ ] Scenarios work with in-memory and real wiring
- [ ] `pnpm typecheck && pnpm lint && pnpm test` pass
