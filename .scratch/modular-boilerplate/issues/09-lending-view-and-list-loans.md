# 09: Lending: view and list loans

**What to build:** A librarian can view a Loan with its status, DueDate and whether it is Overdue, and list Loans filtered by Member and by status. Overdue is computed on read from the DueDate and the injected clock, so no background job is needed.

**Blocked by:** 06

**Status:** ready-for-agent

- [ ] Viewing a loan returns its status, due date and overdue flag
- [ ] Viewing an unknown loan returns 404
- [ ] Listing filters by member and by status, individually and combined
- [ ] Advancing the fixed clock past a due date flips an active loan to overdue in the response without any write
- [ ] Returned loans are never reported as overdue
- [ ] Scenarios pass against the real Postgres (`pnpm test`)
- [ ] `pnpm typecheck && pnpm lint && pnpm test` pass
