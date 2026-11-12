# ts-modular-boilerplate

Boilerplate for an HTTP API organized as a feature-first modular monolith (the reasoning behind the architecture decisions is in `README.md`). The example domain is a library: `catalog` is implemented; `lending` is implemented too (borrow, return, rules, view/list). Domain, code, docs and error messages are in **English**.

**Stack:** Node 26 + TypeScript ESM (`nodenext`, `strict`), Fastify 5, Prisma 7 (`prisma-client` + `@prisma/adapter-pg`) on PostgreSQL 18, Zod 4, Vitest, ESLint (typescript-eslint type-checked) + Prettier, pnpm.

**Folder map:**

```
src/
  main.ts            startup: env + Prisma client + buildApp() + listen + graceful shutdown
  app.ts             buildApp(deps): the only composition root
  modules/<name>/    http/ application/ domain/ infra/ + index.ts (public entry point)
    catalog/         books (simple module: use cases + repository)
    lending/         loans (rich domain: Loan entity as branded data + functions; reaches catalog via a port wired in app.ts)
  platform/          config/env.ts, db/client.ts (+ generated/), http/ (createServer, errorHandler, errorMapper), logging/
  shared/            BusinessError and subclasses, Clock, IdGenerator
prisma/schema/       one .prisma file per module (+ base.prisma); migrations/
tests/               *.test.ts (Vitest, real Postgres); domain/ = DB-free domain tests; support/ = testApp, fakeClock, testConfig
docs/api.md          endpoint contract
README.md            overview and architecture decisions (in Spanish)
docs/api/            request collection (OpenCollection/Bruno) for manual testing
CONTEXT.md           domain vocabulary
prisma.config.ts     Prisma CLI config
docker-compose.yml   local Postgres
```

## Why does each part exist?

- **Modules with layers:** `http` (Fastify routes + Zod schemas + presenters), `application` (use cases and repository interfaces), `domain` (entity types; rules once a module needs them), `infra` (Prisma repositories). Each module exposes only its `index.ts`.
- **Boundaries are enforced by ESLint** (`eslint.config.*`, tested in `tests/architecture-rules.test.ts`): modules never import each other (cross-module needs go through a port in the consumer, adapted in `app.ts`); `application`/`domain` cannot import `http`, `infra`, `platform`, or `fastify`/`zod`/Prisma/`pg`; `domain` cannot import `application`. Each module is the only reader/writer of its tables, which live in its own Postgres schema with no foreign keys or relations to other modules' tables: other modules' ids are plain columns; ESLint (heuristic: aliases, destructuring and raw SQL are not caught) rejects `prisma.<model>` (also `tx.`/`this.prisma.`) outside the owning module's `infra/`, where the owner is the module whose `prisma/schema/<module>.prisma` declares the model (tests are exempt so they can delete the rows they create). Tests may also import a module's `domain/` (`tests/domain/`).
- **Domain style:** immutable data and functions, no classes. An entity with rules is a branded `Readonly` type created only by `borrow` (rules) or `rehydrateLoan` (`infra` only); instants are `Temporal.Instant`; data without rules is a plain `type` (`Book`). Details in `.claude/rules/application.md`.
- **Use cases are factory functions** (`registerBookUseCase(deps)` in `application/useCases/`) that receive their dependencies. `buildApp(deps)` is the single place that creates concrete ones. Tests run the real app on the local Postgres and only inject `generateId` and `clock` (`tests/support/testApp.ts`). No in-memory repositories and no `vi.mock` of the DB client.
- **`BusinessError` + `errorHandler`:** business errors carry only `code` and `message`; `platform/http/errorMapper.ts` maps them to HTTP and keeps the format `{ error: { code, message, traceId } }`. Schema validation errors → 400 `VALIDATION_ERROR` (with `details`), `UnauthorizedError` → 401, `ForbiddenError` → 403, `NotFoundError` → 404, `ConflictError` → 409, other `BusinessError` → 422, anything else → 500. Handlers do not catch errors.
- **`buildApp()` separate from `main.ts`:** allows tests with `app.inject` without opening a port.
- **`platform/config/env.ts`:** fails fast (`process.exit(1)`) if the environment is invalid; `main.ts` passes the config down, the rest of the code never reads `process.env`.
- **`docs/api.md`:** public contract; client and code must match it. Known limitation: list endpoints (`GET /books`) are not paginated and return every row; add pagination (documented in `docs/api.md` first) before using a listing on a table with real data, and do not copy the pattern as is.
- **Rules per layer:** details for application code, tests and Prisma live in `.claude/rules/` and load when touching those files. Full REST conventions: skill `api-conventions`.

## How do we work?

### First time

```
cp .env.example .env            # edit DB_PASSWORD (required by docker compose and by Prisma commands that connect)
docker compose up -d postgres
pnpm install
pnpm db:generate                # mandatory: without it tsc/dev/lint fail
pnpm db:migrate
```

### Commands

- `pnpm dev` — server with reload (`tsx watch`) on :3000
- `pnpm test` — Vitest against the real local Postgres (needs `docker compose up -d postgres` + `pnpm db:migrate`); each test deletes only the rows it created. One file: `pnpm test -- tests/catalog.test.ts`; one test: `pnpm test -- -t "name"`
- `pnpm typecheck` — `tsc --noEmit` (includes `tests/`)
- `pnpm lint` / `pnpm format` — ESLint / Prettier
- `pnpm db:generate` — after cloning and after every change to `prisma/schema/*.prisma`
- `pnpm db:migrate` — `prisma migrate dev`
- `pnpm build` / `pnpm start` — compile to `dist/` and run
- `docker compose --profile app up --build -d` — run the production image locally (api + Postgres) to smoke-test it; the plain `docker compose up -d postgres` does not start the api. The image only reads environment variables, so the same image runs anywhere; migrations are manual and never run at build or start

### Start a project from this template

1. Create your first module by copying `src/modules/catalog/` (the simple module) to `src/modules/<name>/`: rename its files and exports, add `prisma/schema/<name>.prisma` (own Postgres schema, see `.claude/rules/prisma.md`) and mount it in `src/app.ts`.
2. Delete the example modules `src/modules/catalog/` and `src/modules/lending/`, their `prisma/schema/{catalog,lending}.prisma` and migrations (regenerate with `pnpm db:migrate`), their `tests/*.test.ts`, the `docs/api/` collection and the matching sections of `docs/api.md`. Remove their wiring from `src/app.ts`.
3. Update `package.json` name, `.env.example`, `CONTEXT.md` and the architecture notes in `README.md` to your domain.

### Verification (before considering something done)

`pnpm typecheck && pnpm lint && pnpm test` (Postgres must be up and migrated). If you changed an endpoint, status code or error code, update `docs/api.md` and the test.

### Project rules

- Relative imports with the `.js` extension (ESM); `import type` for types (`verbatimModuleSyntax`).
- Strict TypeScript: no `any`, `type` instead of `interface`, unused args prefixed with `_`. `exactOptionalPropertyTypes` is on: no explicit `undefined` in optional props (conditional spread).
- Prettier: double quotes, `;`, trailing comma, 100 columns.
- Branches `feat/…` and `fix/…`; commits with Conventional Commits.
- `.env` is gitignored: never commit it; document new variables in `.env.example` and `platform/config/env.ts`.
- Language: all documentation, code, domain terms and error messages are written in **English**, except `README.md`, which is in Spanish.

## Domain vocabulary

`CONTEXT.md` defines the domain terms (Book, Retired, Member, Loan, DueDate, Overdue); use them in code, tests and docs.
