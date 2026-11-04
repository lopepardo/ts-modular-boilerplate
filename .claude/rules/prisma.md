---
paths:
  - "prisma/**"
  - "prisma.config.ts"
  - "src/platform/db/**/*.ts"
---

# Prisma

- Do not edit migrations that were already applied: create a new one.
- After changing `schema.prisma`, run `pnpm db:generate`.
- Import the client from `./generated/client.js`, not from `@prisma/client`.
- `prisma.config.ts` reads `DB_*` on its own (it does not go through `env.ts`).
