---
paths:
  - "tests/**/*.ts"
---

# Tests

- No DB and no `vi.mock` of the DB client (ADR 0002). Build the app with `buildApp({ config: testConfig, prisma: fakePrisma, <module>: { repository: createInMemory…() } })`; `fakePrisma` throws if touched.
- Exercise routes with `app.inject`; use a deterministic `generateId` (and a fixed clock when time matters).
- Reference pattern: `tests/catalog.test.ts`. HTTP scenarios live once in `tests/support/<module>Scenarios.ts` and are run by two wirings: in-memory (`tests/<module>.test.ts`, `pnpm test`) and Prisma (`tests/integration/<module>.integration.test.ts`, `pnpm test:integration`). Integration tests may use the real DB but must delete only the rows they created.
- Also cover errors: 400 `VALIDATION_ERROR` and the use cases' `BusinessError`s (404/409/422).
