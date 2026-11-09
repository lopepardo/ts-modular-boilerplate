# 06: Lending: borrow a book

**What to build:** A **Member** (an opaque external id, not validated) can borrow a Book, creating an `active` **Loan** with a **DueDate** 14 days after creation, computed with an injected clock. `lending` is the rich-domain module: `Loan` is an entity with state and `DueDate` a value object; ids are generated at creation through the injected generator. Borrowing asks `catalog`, through its public entry point only, whether the Book exists and is not Retired. The `lending` schema file adds a foreign key from the Loan's book to `catalog`'s Book with restrictive delete, plus its migration (ADR 0003).

**Blocked by:** 05

**Status:** done

- [x] Borrowing an existing, non-retired book returns an active Loan with a DueDate exactly 14 days after the (fixed) clock time
- [x] Borrowing an unknown book returns 404
- [x] Borrowing a Retired book is refused with a 409 business error
- [x] `lending` reaches `catalog` only through its public entry point (lint passes)
- [x] The foreign key to Book with restrictive delete is part of the migration
- [x] Scenarios run with in-memory wiring and a controllable clock, and with the real wiring through `pnpm test:integration`
- [x] `pnpm typecheck && pnpm lint && pnpm test` pass
