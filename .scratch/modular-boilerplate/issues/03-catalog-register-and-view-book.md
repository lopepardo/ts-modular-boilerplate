# 03: Catalog: register and view a book

**What to build:** A librarian can register a **Book** (title, author, ISBN) and view it, end to end. Two copies of the same work are two distinct Books. The `catalog` module is simple: use cases plus a repository declared in the application layer, with a Prisma implementation. The Prisma schema becomes multi-file (a base file with generator and datasource, plus one file for `catalog`) with its migration (ADR 0003). Vocabulary follows `CONTEXT.md`.

**Blocked by:** 02

**Status:** done

- [x] Registering a book returns it with an id and is not retired
- [x] Viewing an existing book returns its details and retired state
- [x] Viewing an unknown book returns a not-found business error mapped to 404
- [x] Invalid input returns 400 `VALIDATION_ERROR`
- [x] Registering two books with the same ISBN creates two distinct Books
- [x] Scenarios run through `app.inject` against the real Prisma repositories on Postgres
- [x] The multi-file Prisma schema and `catalog` migration apply cleanly
- [x] `pnpm typecheck && pnpm lint && pnpm test` pass
