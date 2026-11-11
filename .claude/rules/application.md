---
paths:
  - "src/modules/*/application/**/*.ts"
  - "src/modules/*/domain/**/*.ts"
---

# Application and domain code

- Use cases are factory functions that receive their dependencies (repository, `generateId`, clock). Never import `prisma`, `fastify` or `zod` here; ESLint enforces it.
- Layout: `application/{useCases,ports,deps.ts}`, entities in `domain/`. Declare the repository interface in `application/ports/`; implement it in `infra/`. Each use case types its deps as `Pick<ModuleDeps, ...>` with only what it uses.
- Throw `BusinessError` subclasses from `src/shared/errors.ts`; never HTTP statuses.
- For endpoints, errors and layers, follow the `api-conventions` skill.

## Domain style: immutable data and functions

No classes in `domain/`; pick by what the piece is. `lending` is the reference.

- **Entity with rules or state transitions** (`Loan`): a `Readonly` type with a brand that is not exported (`declare const checked: unique symbol`). It is created only by its functions: `borrow` applies the rules; `rehydrateLoan` rebuilds a stored one without them and is for `infra` only (the brand closes the type, so `infra` cannot write the literal). A transition (`giveBack`) returns a copy (`{ ...loan, status }`), which keeps the brand without a cast.
- **Plain data without rules** (`Book`): a `type`, no brand. Add the brand when it gains a rule worth protecting.
- **States with different fields**: a discriminated union (`ActiveLoan | ReturnedLoan`), never optional fields. Not needed while the states share one shape.
- **Value object**: only when a concept gets rules of its own shared by several entities; same style (immutable type + functions named after it).
- **Instants** are `Temporal.Instant` (immutable). `Date` appears only in `infra`, at the Prisma boundary. Time enters as a parameter (`now` from the injected `Clock`); the domain never reads the system clock.
- **A rule over an owner's siblings** (a Member's active Loans): the function receives them and the repository loads and writes atomically (`openLoan`). Every writer goes through that port.
- Unit-test domain code without the database in `tests/domain/`.
