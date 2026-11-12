---
paths:
  - "src/modules/**/*.ts"
  - "src/app.ts"
---

# Modules and boundaries

- A module exposes only its `index.ts`; nobody imports another module's internals (ESLint enforces it).
- Cross-module needs: the consumer declares a port in its `application/ports/`; `src/app.ts` adapts the provider's public API to it. No module imports another.
- Each module is the only reader/writer of its tables (own Postgres schema, no relations or foreign keys to other modules' tables; their ids are plain columns). Do not add events, an outbox or per-module databases until a real need appears; the rationale and the order to grow are in `README.md`.
- `src/app.ts` is the only composition root.
- Advisory locks are shared by the whole database: use the two-key form with a module namespace first, `pg_advisory_xact_lock(hashtext('<module>.<thing>'), hashtext(<id>))`.
