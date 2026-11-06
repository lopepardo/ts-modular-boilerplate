---
paths:
  - "tests/**/*.ts"
---

# Tests

- No DB and no `vi.mock` of the DB client (ADR 0002). Build the app with `buildApp({ config: testConfig, prisma: fakePrisma, <module>: { repository: createInMemory…() } })`; `fakePrisma` throws if touched.
- Exercise routes with `app.inject`; use a deterministic `generateId` (and a fixed clock when time matters).
- Reference pattern: `tests/catalog.test.ts`.
- Also cover errors: 400 `VALIDATION_ERROR` and the use cases' `BusinessError`s (404/409/422).
