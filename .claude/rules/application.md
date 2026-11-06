---
paths:
  - "src/modules/*/application/**/*.ts"
  - "src/modules/*/domain/**/*.ts"
---

# Application and domain code

- Use cases are factory functions that receive their dependencies (repository, `generateId`, clock). Never import `prisma`, `fastify` or `zod` here; ESLint enforces it (ADR 0001).
- Layout: `application/{useCases,ports,deps.ts}`, entities in `domain/`. Declare the repository interface in `application/ports/`; implement it in `infra/`. Each use case types its deps as `Pick<ModuleDeps, ...>` with only what it uses.
- Throw `BusinessError` subclasses from `src/shared/errors.ts`; never HTTP statuses.
- For endpoints, errors and layers, follow the `api-conventions` skill.
