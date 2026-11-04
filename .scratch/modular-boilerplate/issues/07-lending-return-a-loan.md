# 07: Lending: return a loan

**What to build:** A Member can return a Loan, which moves from `active` to `returned` with no way back. Only an active Loan can be returned, a rule enforced by the `Loan` entity. A Loan whose Book was **Retired** after it was borrowed can still be returned normally, so retiring never traps an open loan.

**Blocked by:** 06

**Status:** ready-for-agent

- [ ] Returning an active loan marks it returned
- [ ] Returning an already returned loan is refused with a 409 business error
- [ ] Returning an unknown loan returns 404
- [ ] Returning a loan succeeds even if its book has been retired since
- [ ] Scenarios work with in-memory and real wiring
- [ ] `pnpm typecheck && pnpm lint && pnpm test` pass
