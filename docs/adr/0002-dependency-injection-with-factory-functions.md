# Dependency injection with factory functions, no container

Use cases and modules are built with functions (`createX(deps)`) that receive their dependencies as an argument. `app.ts` is the only composition root: it creates the Prisma client and the modules and wires them together. No DI container or decorators are used (`tsyringe`, `inversify`).

Tests pass in-memory fakes instead of mocking modules, and any implicit dependency (clock, id generator) is injected the same way, to avoid `Date.now()` or hidden singletons.
