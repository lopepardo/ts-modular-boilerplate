---
paths:
  - "prisma/**"
  - "prisma.config.ts"
  - "src/db/**/*.ts"
---

# Prisma

- No edites migraciones ya aplicadas: crea una nueva.
- Tras cambiar `schema.prisma` ejecuta `pnpm db:generate`.
- El cliente se importa de `./generated/client.js`, no de `@prisma/client`.
- `prisma.config.ts` lee `DB_*` por su cuenta (no pasa por `env.ts`).
