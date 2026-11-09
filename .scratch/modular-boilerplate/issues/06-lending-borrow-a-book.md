# 06: Lending: borrow a book

**What to build:** A **Member** (an opaque external id, not validated) can borrow a Book, creating an `active` **Loan** with a **DueDate** 14 days after creation, computed with an injected clock. `lending` is the rich-domain module: `Loan` is an entity with state and `DueDate` a value object; ids are generated at creation through the injected generator. Borrowing asks `catalog`, through its public entry point only, whether the Book exists and is not Retired. The `lending` schema file adds the Loan table in its own Postgres schema, keeping `bookId` as a plain column with no foreign key to `catalog` (ADR 0003), plus its migration.

**Blocked by:** 05

**Status:** done

- [x] Borrowing an existing, non-retired book returns an active Loan with a DueDate exactly 14 days after the (fixed) clock time
- [x] Borrowing an unknown book returns 404
- [x] Borrowing a Retired book is refused with a 409 business error
- [x] `lending` reaches `catalog` only through its public entry point (lint passes)
- [x] `Loan.bookId` is a plain indexed column: no foreign key or relation to Book (ADR 0003)
- [x] Scenarios run through `pnpm test` against the real Prisma wiring on Postgres, with a controllable clock
- [x] `pnpm typecheck && pnpm lint && pnpm test` pass
