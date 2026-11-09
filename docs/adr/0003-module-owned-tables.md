# Module-owned tables, with foreign keys allowed

Each module owns its tables and is the only one that reads and writes them: it never queries or joins tables of another module (checked by ESLint as a heuristic: `prisma.book`, `tx.book`, `db.book` and `client.book` are forbidden outside `catalog/infra`, so aliases, destructuring and raw SQL are not caught and remain a review concern; a model's owner is the module whose `prisma/schema/<module>.prisma` declares it). Data from another module is requested through its public API. The Prisma schema is split into one file per module.

Foreign keys between modules are allowed (`@relation` with `onDelete: Restrict`), only in the direction of the dependency (`Loan.bookId → Book`). FKs give referential integrity at low cost, and removing them the day a module is extracted is trivial, whereas adding them later requires cleaning up orphans.

Resources with history are not deleted: they are retired (`Book` becomes `Retired`), as a business rule and not as a workaround for the lack of an FK.

## Considered Options

- **No FKs between modules:** keeps modules extractable at the DB level, but loses integrity and forces code to solve what the DB solves for free. Rejected as a speculative need (YAGNI).
