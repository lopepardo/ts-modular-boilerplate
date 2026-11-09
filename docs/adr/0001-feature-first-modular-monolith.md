# Feature-first modular monolith with internal layers

Code is organized as `src/modules/<module>/{http,application,domain,infra}` instead of global horizontal layers (`routes/`, `controllers/`, `services/`). Each module exposes only its `index.ts`; boundaries between modules are enforced with ESLint (`no-restricted-imports`). `domain` and `application` do not import from `http`, `infra`, `platform`, or framework/driver packages (`fastify`, `zod`, Prisma, `pg`), and `domain` does not import from `application` (verified in `tests/architecture-rules.test.ts`), which is as much "hexagonal" as is required.

## Considered Options

- **Horizontal layers:** simple, but modules get mixed together and there are no physical boundaries between them.
- **Pure hexagonal across the whole project:** maximum decoupling, but too much ceremony to validate an idea.

## Consequences

- A module starts simple (use cases + repository) and is promoted to a rich domain (classes with state) when a real invariant appears.
- Modules never import each other, not even through `index.ts` (ESLint enforces it, verified in `tests/architecture-rules.test.ts`). When module A needs something from module B, A declares a port in its own `application/ports/` with types of its own, and `app.ts` (the composition root) implements that port by calling B's public use cases. The dependency direction is therefore visible in one place, cycles cannot exist in code, and A's tests just replace the port.
- A module's `index.ts` is consumed only by `app.ts` and tests: the module factory, the use cases that may be adapted, and the repository implementations to choose from. Domain entities are not exported.
- Calls between modules are synchronous and in-process. Domain events are out of scope until a project needs them.
