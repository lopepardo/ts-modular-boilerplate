# Module-owned data: one Postgres schema per module, no foreign keys between modules

Treat each module as if it were already a service with its own database that, for now, shares a server and a process with the others. The test for any data decision: _if this module had its own database tomorrow, would this still work?_

Each module owns its tables and is the only one that reads and writes them (ADR 0001 gives the code boundary; this ADR gives the data boundary):

- **One Postgres schema per module** (`catalog."Book"`, `lending."Loan"`), declared with `@@schema("<module>")` and listed in `datasource.schemas` in `prisma/schema/base.prisma`. Extracting a module later starts with `pg_dump -n <module>`.
- **One Prisma file per module** (`prisma/schema/<module>.prisma`); `base.prisma` holds only the generator and datasource.
- **No relations or foreign keys between modules.** A module stores another module's id as a plain column (`Loan.bookId`), exactly like `memberId`, which points outside the application. Prisma needs a relation field on both models for a foreign key, so an `@relation` would also make `catalog` know about `lending` in its own schema, and it would let `include: { book: true }` read another module's table, which the lint rule cannot see.
- **No cross-module joins.** If `lending` needs data about Books, it asks `catalog` through a port (for lists, a batch call such as `getBooks(ids)`) and combines the results in memory.
- ESLint (heuristic: aliases, destructuring and raw SQL are not caught) rejects `prisma.<model>` (also `tx.`/`this.prisma.`) outside the owning module's `infra/`; the owner is the module whose `prisma/schema/<module>.prisma` declares the model. Tests are exempt so integration cleanup works.

## What the database still guarantees

Integrity does not disappear; it moves. **Inside a module** the database enforces everything: foreign keys between that module's own tables, `UNIQUE`, `CHECK`, `NOT NULL`, partial indexes. Example: `Loan_one_active_per_book` is a partial unique index, so a Book has at most one `active` Loan even under concurrent requests. **Between modules** the code enforces it: the port (`lending` checks the Book exists before lending it) and the business rules (Books are retired, never deleted, so a stored `bookId` never dangles).

## Transactions

Whatever must change atomically lives in the same module. Transactions are per module and live in its repository (`infra`). There is no transaction across modules; when a rule seems to need one, either (1) redesign the rule so an interleaving leaves a valid state (retiring a Book while it is being lent leaves an active Loan of a Retired Book, which `CONTEXT.md` allows), or (2) react with an event (ADR 0004), or (3) the boundary is probably wrong and both things belong in one module.

## Triggers

Technical triggers inside a module (`updatedAt`, audit columns) are fine. Business rules live in code, where the in-memory tests can see them. Triggers that cross modules are forbidden: they are invisible coupling.

## Considered Options

- **Foreign keys toward the dependency (`Loan.bookId → Book`, `onDelete: Restrict`):** this was the first decision. Rejected: the integrity gain is small (Books are never deleted and borrowing already checks existence), while the relation fields leak the dependency into `catalog`'s schema, make deleting a module break `prisma generate`, and open an unlinted path to another module's tables.
- **Everything in the `public` schema:** simpler, but ownership is then visible only in file names.
