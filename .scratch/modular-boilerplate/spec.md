Status: ready-for-agent

# Modular TypeScript API boilerplate

## Problem Statement

Every time I start a TypeScript project I begin from scratch or copy code that was not designed to be reused. The current repo (an expenses API built for learning) has global horizontal layers, services import the Prisma singleton directly (no dependency injection), there are no boundaries between modules, and there is no place to see how to grow from a simple idea into a domain with rules. I need a starting point that lets me validate an idea quickly and, when the idea matures, lets me introduce a rich domain without restructuring everything.

## Solution

Turn the repo into a boilerplate (GitHub template repository) for an HTTP API with Fastify, Prisma and Postgres, organized as a feature-first modular monolith. It includes ready-made infrastructure (env, errors, database, tests, lint), an empty skeleton for creating new modules, and an example domain —a library— with two modules: `catalog` (simple, CRUD) and `lending` (with a rich domain: entity with state, value object, rules and clock injection) that depends on `catalog` through its public API. The expenses API (`expenses`) is removed. The example's vocabulary is in `CONTEXT.md` and the architecture decisions are in `docs/adr/`.

## User Stories

1. As a developer starting a new project, I want to create a repo from a GitHub template, so that I get a working, tested API skeleton in minutes.
2. As a developer, I want `pnpm install`, the database setup commands and `pnpm dev` to work from the README/CLAUDE.md instructions alone, so that I can start coding without reverse-engineering the repo.
3. As a developer, I want every module to live in its own folder with `http`, `application`, `domain` and `infra` layers, so that I always know where each kind of code goes.
4. As a developer, I want each module to expose a single public entry point, so that other modules can only depend on what the module deliberately offers.
5. As a developer, I want `pnpm lint` to fail when a module imports another module's internals, so that boundaries do not erode silently.
6. As a developer, I want `pnpm lint` to fail when a module accesses another module's tables, so that data ownership stays clear.
7. As a developer, I want `application` and `domain` code to be unable to import from `http` or `infra`, so that business rules stay independent of Fastify and Prisma.
8. As a developer, I want an empty `_template` module, so that I can copy and rename it to create a new module without inheriting leftovers from the example domain.
9. As a developer, I want the example modules to be easy to delete, so that I can replace the library domain with my own at the start of a project.
10. As a developer, I want a module to start simple (use cases plus a repository, no domain classes), so that I do not model a domain before I know whether the idea is worth it.
11. As a developer, I want a reference module with a rich domain, so that I can see how to promote a simple module when real invariants appear.
12. As a developer, I want use cases to be built with factory functions that receive their dependencies, so that I can test them without mocking modules.
13. As a developer, I want a single composition root that wires the database client, the repositories and the modules together, so that there is exactly one place that creates concrete dependencies.
14. As a developer, I want implicit dependencies such as the clock and id generation to be injected too, so that tests are deterministic.
15. As a developer, I want data access to go through a repository declared by the application layer and implemented with Prisma, so that I can swap it for an in-memory fake in tests.
16. As a developer, I want business errors to carry a code and a message without knowing anything about HTTP, so that the domain does not depend on status codes.
17. As an API client, I want every error to keep the shape `{ error: { code, message, traceId } }`, so that clients handle failures uniformly.
18. As an API client, I want validation failures to return 400 `VALIDATION_ERROR` with details, so that I can show field-level feedback.
19. As a developer, I want the shared database to have one Prisma schema file per module, so that each module's tables are easy to find.
20. As a developer, I want foreign keys between modules allowed only in the direction of the dependency with restrictive delete behavior, so that I get referential integrity without coupling the data access.
21. As a developer, I want `pnpm test` to run without a database, so that the feedback loop is fast.
22. As a developer, I want `pnpm test:integration` to run the same HTTP scenarios against a real Postgres, so that migrations, foreign keys and the Prisma mapping are verified.
23. As a developer, I want each test scenario written once and executed with both in-memory and real wiring, so that I do not maintain two suites.
24. As a developer, I want `pnpm typecheck && pnpm lint && pnpm test` to pass on a fresh checkout, so that I trust the template.
25. As a developer, I want `CLAUDE.md`, the layer rules, the API docs and the request collection to describe the new structure, so that agents and humans work from accurate instructions.
26. As a librarian, I want to register a book with title, author and ISBN, so that it becomes available in the catalog.
27. As a librarian, I want to register two copies of the same work as two distinct books, so that each physical copy is tracked on its own.
28. As a librarian, I want to list and search books, so that I can find a specific copy.
29. As a librarian, I want to view a single book, so that I can check its details and whether it is retired.
30. As a librarian, I want to retire a book, so that it leaves circulation without losing its history.
31. As a librarian, I want retiring an already retired book to be handled predictably, so that repeated requests do not corrupt anything.
32. As a librarian, I want books never to be deleted, so that past loans always point to an existing book.
33. As a member, I want to borrow an existing, non-retired book, so that I can take it home.
34. As a member, I want my loan to get a due date 14 days from the moment it is created, so that I know when to return it.
35. As a member, I want to be refused when the book does not exist, so that I get a clear not-found answer.
36. As a member, I want to be refused when the book is retired, so that I know it cannot be lent.
37. As a member, I want to be refused when the book already has an active loan, so that two people never hold the same copy.
38. As a member, I want to be refused when I already have 3 active loans, so that the limit is enforced.
39. As a member, I want to be refused when any of my active loans is overdue, so that overdue books must be returned first.
40. As a member, I want to return a book I borrowed, so that the loan is closed and the book becomes available again.
41. As a member, I want returning a loan that is already returned to be refused, so that a loan cannot be closed twice.
42. As a member, I want to return a book that was retired after I borrowed it, so that retiring a book never traps an open loan.
43. As a librarian, I want to see a loan with its status, due date and whether it is overdue, so that I can follow up with the member.
44. As a librarian, I want to list loans filtered by member and by status, so that I can see what each member holds and what is overdue.
45. As a librarian, I want overdue to be computed from the due date and the current time, so that no background job is needed to keep statuses fresh.
46. As a member, I want my 3-loan count to ignore returned loans, so that returning a book frees a slot.
47. As a developer, I want `lending` not to validate that a member exists, so that the example stays at two modules and a member is just an external identifier.

## Implementation Decisions

- **Target shape.** Feature-first modular monolith (ADR 0001). A `platform` area holds global infrastructure (environment validation, database client, HTTP plugins) and a `shared` area holds only cross-cutting primitives (business error base types). All business code lives under modules.
- **Module layers.** Each module has `http` (routes, Zod schemas, presenters), `application` (use cases and the repository type), `domain` (entities and value objects, present only when invariants justify them) and `infra` (Prisma repository). `domain` and `application` never import `http` or `infra`.
- **Public module API.** Each module exposes one entry point that exports a module factory, the already-built use cases other modules may call, and public types. Cross-module calls are synchronous and in-process; domain events are out of scope.
- **Dependency injection (ADR 0002).** Use cases and modules are factory functions taking their dependencies. The app builder accepts overrides for every dependency (repositories, clock, id generator) and creates real ones by default; it remains the only place that instantiates concrete dependencies. No DI container, no decorators.
- **Repositories.** Every module, including simple ones, declares a repository type in its application layer and implements it with Prisma in its infra layer. Rich modules' repositories return domain entities; simple modules' repositories return plain records.
- **Errors.** Domain and application throw business errors carrying `code` and `message` without HTTP knowledge. The central error handler maps them to status codes and keeps the `{ error: { code, message, traceId } }` format; schema validation errors map to 400 `VALIDATION_ERROR` with `details`; other `BusinessError`s map to 422. Existing `AppError` behavior is migrated onto this model.
- **Data ownership (ADR 0003).** One Prisma schema file per module plus a base file for generator and datasource. A module reads and writes only its own tables; data from other modules is requested through their public API. Foreign keys across modules are allowed only toward the dependency (loan → book) with restrictive delete. ESLint forbids accessing another module's tables and importing another module's internals.
- **Identity.** Entities in rich modules generate their own ids at creation, before persistence; the application always generates ids through the injected `IdGenerator` (ADR 0002), and Prisma models declare `@id` without `@default`.
- **Module `catalog` (simple).** Book with title, author, ISBN and a retired flag (term definitions in `CONTEXT.md`). Operations: register, get, list/search, retire. Retiring is idempotent from the client's point of view. There is no delete operation. Exposes a public query to check a book exists and whether it is retired.
- **Module `lending` (rich).** `Loan` is an entity with status `active` → `returned` and no way back; `DueDate` is a value object set to 14 days after creation; `Overdue` is derived from due date and an injected clock, never stored. Rules enforced when borrowing: book exists and is not retired (via `catalog`'s public API), the book has no active loan, the member has fewer than 3 active loans, the member has no overdue loan. Rule enforced by the entity when returning: only an active loan can be returned. Returning is allowed even if the book was retired afterwards. The member is an opaque external identifier and is not validated.
- **Proposed HTTP contract** (to be finalized in the API docs): `POST /books`, `GET /books`, `GET /books/:id`, `POST /books/:id/retire`; `POST /loans`, `GET /loans` (filter by member and status), `GET /loans/:id`, `POST /loans/:id/return`. Expected business failures use English error codes (for example book not found → 404; book retired, book already loaned, member loan limit reached, member has overdue loans, loan not active → 409) and 400 for invalid input.
- **Module scaffold.** An empty `_template` module with the four layers, a repository type, one use case and one example test, to be copied and renamed.
- **Removal.** The `expenses` resource, its table and its migration are removed and replaced by a fresh migration for the library tables. No tag or backup of the old code is kept.
- **Documentation and naming.** `CLAUDE.md`, the layer rules, the API contract document and the request collection are rewritten for the new structure. The project is renamed to a generic name. Documentation, code, domain and error messages are all written in English.
- **Delivery plan.** One branch, one commit per ticket in `issues/` (01–11), each leaving `pnpm typecheck && pnpm lint && pnpm test` green.

## Testing Decisions

- **What makes a good test.** It exercises external behavior only: HTTP request in, status/body out (and, for integration, persisted state observed through the API). It never asserts on internal calls, private state or which collaborators were invoked.
- **Single seam.** The application is built through the app builder with injectable dependencies and driven with `app.inject`. This is the same seam used by the existing tests, now with dependencies passed in.
- **Default wiring (`pnpm test`).** In-memory repositories and a fixed, controllable clock. No database. Covers every rule in `CONTEXT.md` end to end through HTTP: the 3-loan limit, one active loan per book, the overdue block, retired books (cannot be borrowed, can still be returned), double return, due date at 14 days, derived overdue when the clock advances.
- **Integration wiring (`pnpm test:integration`).** The same scenarios run against the real Prisma repositories on the local Postgres. Verifies migrations, the restrictive foreign key and the entity-to-row mapping. Scenarios are written once and shared by both wirings.
- **No dedicated unit seams by default.** Isolated tests of `Loan` or `DueDate` are added only if a rule has so many combinations that covering it through HTTP is impractical; that call is made while implementing `lending`.
- **Lint as a check.** Module boundary and table-access rules are verified by `pnpm lint`, not by tests.
- **Prior art.** The existing `app.inject`-based tests for health and expenses, and the "tests without a database" convention in the current test rules.

## Out of Scope

- Domain events and asynchronous communication between modules.
- Authentication, authorization and a member registry (a member is only an identifier).
- Fines, renewals, reservations or due-date configuration.
- Separate deployment or database per module, and extracting modules into services.
- Workers, CLIs, libraries or non-HTTP entry points.
- A module generator script or a DI container.
- Pagination, sorting and search relevance beyond what the example needs.
- Preserving the old `expenses` API or its data.

## Further Notes

- Vocabulary is defined in `CONTEXT.md`; use those terms (Book, Retired, Member, Loan, DueDate, Overdue) in code, tests and docs, and avoid the listed synonyms.
- Decisions are recorded in `docs/adr/0001` (modular monolith), `0002` (dependency injection with factory functions) and `0003` (module-owned tables, foreign keys allowed).
- The repo must be marked as a GitHub template repository once it has a remote; today it has none.
- The triage skill is not installed, so `Status: ready-for-agent` is used as the default role string.
