# 03: Catalog: register and view a book

**What to build:** A librarian can register a **Book** (title, author, ISBN) and view it, end to end. Two copies of the same work are two distinct Books. The `catalog` module is simple: use cases plus a repository declared in the application layer, with an in-memory implementation for tests and a Prisma implementation. The Prisma schema becomes multi-file (a base file with generator and datasource, plus one file for `catalog`) with its migration (ADR 0003). Vocabulary follows `CONTEXT.md`.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] Registering a book returns it with an id and is not retired
- [ ] Viewing an existing book returns its details and retired state
- [ ] Viewing an unknown book returns a not-found business error mapped to 404
- [ ] Invalid input returns 422 `VALIDATION_ERROR`
- [ ] Registering two books with the same ISBN creates two distinct Books
- [ ] Scenarios run through `app.inject` with in-memory repositories and no database
- [ ] The multi-file Prisma schema and `catalog` migration apply cleanly
- [ ] `pnpm typecheck && pnpm lint && pnpm test` pass
