---
paths:
  - "tests/**/*.ts"
---

# Tests

- No DB: mock `../src/platform/db/client.js` with `vi.mock` + `vi.hoisted`.
- Exercise routes with `app.inject` after `await import("../src/app.js")`.
- Reference pattern: `tests/catalog.test.ts`.
- Also cover errors: 422 `VALIDATION_ERROR` and the service's `BusinessError`s.
