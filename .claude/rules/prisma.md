---
paths:
  - "prisma/**"
  - "prisma.config.ts"
  - "src/platform/db/**/*.ts"
---

# Prisma

- Do not edit migrations that were already applied: create a new one.
- After changing `prisma/schema/*.prisma`, run `pnpm db:generate`.
- One Postgres schema per module: new module → `@@schema("<module>")` on its models/enums and add the name to `datasource.schemas` in `base.prisma`.
- No `@relation` to another module's model (ADR 0003): store its id as a plain column. Transactions stay inside one module's repository.
- Import the client from `./generated/client.js`, not from `@prisma/client`.
- `prisma.config.ts` reads `DB_*` on its own (it does not go through `env.ts`).
