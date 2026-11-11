---
paths:
  - "tests/**/*.ts"
---

# Tests

- Tests run against the real local Postgres (`docker compose up -d postgres` + `pnpm db:migrate`). No in-memory repositories, no fake Prisma and no `vi.mock` of the DB client.
- Build the app with `createTestApp()` from `tests/support/testApp.ts`: it wires the real Prisma repositories, records every id the app generates and returns `cleanup`. Pass `purge` to delete the rows of the tables your test writes, and `clock: createFakeClock(...)` when time matters.
- Delete only the rows the test created (`purge` receives the generated ids); never truncate tables, the developer's own data lives in the same database.
- Exercise routes with `app.inject`. Files run one at a time (`fileParallelism: false`) because they share the database.
- Reference pattern: `tests/catalog.test.ts` (one `setup()` per `describe`, `cleanup` in `afterAll`).
- Exception: `tests/domain/*.test.ts` import a module's `domain/` directly (the only internals a test may import), with no database and no app. Cover rule order and boundaries there; end-to-end behavior stays in the HTTP tests.
- Also cover errors: 400 `VALIDATION_ERROR` and the use cases' `BusinessError`s (404/409/422).
