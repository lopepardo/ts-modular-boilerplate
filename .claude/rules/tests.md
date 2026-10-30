---
paths:
  - "tests/**/*.ts"
---

# Tests

- Sin BD: mockea `../src/db/client.js` con `vi.mock` + `vi.hoisted`.
- Ejercita rutas con `app.inject` tras `await import("../src/app.js")`.
- Patrón de referencia: `tests/expenses.test.ts`.
- Cubre también los errores: 422 `VALIDATION_ERROR` y los `AppError` del service.
