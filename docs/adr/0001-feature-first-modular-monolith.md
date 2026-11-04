# Feature-first modular monolith with internal layers

Code is organized as `src/modules/<module>/{http,application,domain,infra}` instead of global horizontal layers (`routes/`, `controllers/`, `services/`). Each module exposes only its `index.ts`; boundaries between modules are enforced with ESLint (`no-restricted-imports`). `domain` and `application` do not import from `http` or `infra`, which is as much "hexagonal" as is required.

## Considered Options

- **Horizontal layers:** simple, but modules get mixed together and there are no physical boundaries between them.
- **Pure hexagonal across the whole project:** maximum decoupling, but too much ceremony to validate an idea.

## Consequences

- A module starts simple (use cases + repository) and is promoted to a rich domain (classes with state) when a real invariant appears.
- A module depends on another only through its public API, synchronously. Domain events are out of scope until a project needs them.
