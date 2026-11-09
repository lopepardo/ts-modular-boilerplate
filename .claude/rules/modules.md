---
paths:
  - "src/modules/**/*.ts"
  - "src/app.ts"
---

# Modules and boundaries

- A module exposes only its `index.ts`; nobody imports another module's internals (ESLint enforces it, ADR 0001).
- Cross-module needs: the consumer declares a port in its `application/ports/`; `src/app.ts` adapts the provider's public API to it (ADR 0002). No module imports another.
- Each module is the only reader/writer of its tables (own Postgres schema, no relations or foreign keys to other modules' tables; their ids are plain columns, ADR 0003). Growing toward events/services: ADR 0004.
- `src/app.ts` is the only composition root; `src/modules/_template/` is a copy-me module and is not mounted.
