# 07: Lending: return a loan

**What to build:** A Member can return a Loan, which moves from `active` to `returned` with no way back. Only an active Loan can be returned, a rule enforced by the `Loan` entity. A Loan whose Book was **Retired** after it was borrowed can still be returned normally, so retiring never traps an open loan.

**Blocked by:** 06

**Status:** done

- [x] Returning an active loan marks it returned
- [x] Returning an already returned loan is refused with a 409 business error
- [x] Returning an unknown loan returns 404
- [x] Returning a loan succeeds even if its book has been retired since
- [x] Scenarios pass against the real Postgres (`pnpm test`)
- [x] `pnpm typecheck && pnpm lint && pnpm test` pass
