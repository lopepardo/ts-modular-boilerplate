# Dependency injection with factory functions, no container

Use cases and modules are built with functions (`createX(deps)`) that receive their dependencies as an argument. `app.ts` is the only composition root: it receives the Prisma client, builds each module's Prisma repository and wires the modules together. No DI container or decorators are used (`tsyringe`, `inversify`).

Tests run the real modules against a real Postgres instead of mocking them or swapping in in-memory fakes, and any implicit dependency (clock, id generator) is injected so tests stay deterministic, to avoid `Date.now()` or hidden singletons. Ids are generated only by the application (`IdGenerator`); Prisma models declare `@id` without `@default`, so there is a single source of ids.

## Who does what

- `main.ts` owns the process: it creates the Prisma client (`createPrismaClient(env)`), calls `buildApp({ config: env, prisma })`, listens, and on shutdown closes the app and disconnects the client. It is the only place that touches `process` signals and the real database connection.
- `app.ts` (`buildApp`) assembles the application: it calls `createServer()` and, for each module, builds it with its repository and mounts its routes under a prefix. It imports `PrismaClient` only as a type and never creates it.
- `platform/http/createServer.ts` holds the cross-cutting Fastify setup (logger, validator, error handlers, cors, `/health`) and knows nothing about modules.
- A module's `index.ts` is its public API: the `createXModule(deps)` factory, its Prisma repository factory and the few types a consumer needs. It does not build its own repository; the composition root does.

## Injection in tests

`buildApp` accepts `generateId` and `clock`; anything omitted uses the real implementation. Tests build the app with `createTestApp()` (`tests/support/testApp.ts`), which passes the real Prisma client for the local Postgres and records the ids it generates so each test deletes only the rows it created. There are no in-memory repositories and no `vi.mock` of `platform/db/client`: what runs in tests is what runs in production, including migrations and database constraints.

## `_template`

`modules/_template` is a copy-me example, not part of the product. `app.ts` does not mount it and it has no test of its own: copy it, rename it and write the tests for the new module.

## Open

A common `Module` shape (`{ prefix, routes }`) to iterate over modules is deferred until there are enough real modules to justify it. Until then, each module is built and registered explicitly in `app.ts`.
