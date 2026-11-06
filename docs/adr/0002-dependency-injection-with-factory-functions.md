# Dependency injection with factory functions, no container

Use cases and modules are built with functions (`createX(deps)`) that receive their dependencies as an argument. `app.ts` is the only composition root: it receives the Prisma client, picks each module's infrastructure and wires the modules together. No DI container or decorators are used (`tsyringe`, `inversify`).

Tests pass in-memory fakes instead of mocking modules, and any implicit dependency (clock, id generator) is injected the same way, to avoid `Date.now()` or hidden singletons. Ids are generated only by the application (`IdGenerator`); Prisma models declare `@id` without `@default`, so there is a single source of ids.

## Who does what

- `main.ts` owns the process: it creates the Prisma client (`createPrismaClient(env)`), calls `buildApp({ config: env, prisma })`, listens, and on shutdown closes the app and disconnects the client. It is the only place that touches `process` signals and the real database connection.
- `app.ts` (`buildApp`) assembles the application: it calls `createServer()` and, for each module, builds it with its repository and mounts its routes under a prefix. It imports `PrismaClient` only as a type and never creates it.
- `platform/http/createServer.ts` holds the cross-cutting Fastify setup (logger, validator, error handlers, cors, `/health`) and knows nothing about modules.
- A module's `index.ts` is its public API: the `createXModule(deps)` factory, its types and the repository implementations that `app.ts` may choose from. It does not decide which implementation runs; the composition root does.

## Overrides in tests

`buildApp` accepts per-module overrides (`catalog: { repository }`) and `generateId`. Anything omitted uses the real implementation. Tests with in-memory repositories pass `fakePrisma` (`tests/support/fakePrisma.ts`), a stand-in that throws if it is touched, so a test that reaches the database by mistake fails loudly. No `vi.mock` of `platform/db/client` is needed.

## `_template`

`modules/_template` is a copy-me example, not part of the product. `app.ts` does not mount it; its test wires `createTemplateModule` onto a bare `createServer()`.

## Open

A common `Module` shape (`{ prefix, routes }`) to iterate over modules is deferred until there are enough real modules to justify it. Until then, each module is built and registered explicitly in `app.ts`.
