# ts-modular-boilerplate

Boilerplate for an HTTP API organized as a feature-first modular monolith (ADR 0001–0003). The example domain is a library: `catalog` is implemented; `lending` is still to be built (see `.scratch/modular-boilerplate/`). Domain, code, docs and error messages are in **English**.

**Stack:** Node + TypeScript ESM (`nodenext`, `strict`), Fastify 5, Prisma 7 (`prisma-client` + `@prisma/adapter-pg`) on PostgreSQL 18, Zod 4, Vitest, ESLint (typescript-eslint type-checked) + Prettier, pnpm.

**Folder map:**

```
src/
  main.ts            startup: env + Prisma client + buildApp() + listen + graceful shutdown
  app.ts             buildApp(deps): the only composition root (ADR 0002)
  modules/<name>/    http/ application/ domain/ infra/ + index.ts (public entry point)
    _template/       copy-me module; deliberately not mounted in app.ts
    catalog/         books (simple module: use cases + repository)
  platform/          config/env.ts, db/client.ts (+ generated/), http/ (createServer, errorHandler, errorMapper), logging/
  shared/            BusinessError and subclasses, Clock, IdGenerator
prisma/schema/       one .prisma file per module (+ base.prisma); migrations/
tests/               *.test.ts (Vitest, no DB); support/ = fakePrisma, testConfig
docs/api.md          endpoint contract
docs/adr/            architecture decisions
docs/api/            request collection (OpenCollection/Bruno) for manual testing
CONTEXT.md           domain vocabulary
prisma.config.ts     Prisma CLI config
docker-compose.yml   local Postgres
```

## Why does each part exist?

- **Modules with layers:** `http` (Fastify routes + Zod schemas + presenters), `application` (use cases and repository interfaces), `domain` (entities and rules, once a module needs them), `infra` (Prisma and in-memory repositories). Each module exposes only its `index.ts`.
- **Boundaries are enforced by ESLint** (`eslint.config.*`, tested in `tests/architecture-rules.test.ts`): no importing another module's internals; `application`/`domain` cannot import `http`, `infra`, `platform`, or `fastify`/`zod`/Prisma/`pg`; `domain` cannot import `application`. Each module is the only reader/writer of its tables (ADR 0003); the lint rule for table access is still pending (issue 05).
- **Use cases are factory functions** (`registerBookUseCase(deps)`) that receive their dependencies. `buildApp(deps)` is the single place that creates concrete ones; tests override per module (`catalog: { repository }`) and pass `fakePrisma`. No `vi.mock` of the DB client.
- **`BusinessError` + `errorHandler`:** business errors carry only `code` and `message`; `platform/http/errorMapper.ts` maps them to HTTP and keeps the format `{ error: { code, message, traceId } }`. Schema validation errors → 400 `VALIDATION_ERROR` (with `details`), `UnauthorizedError` → 401, `ForbiddenError` → 403, `NotFoundError` → 404, `ConflictError` → 409, other `BusinessError` → 422, anything else → 500. Handlers do not catch errors.
- **`buildApp()` separate from `main.ts`:** allows tests with `app.inject` without opening a port.
- **`platform/config/env.ts`:** fails fast (`process.exit(1)`) if the environment is invalid; `main.ts` passes the config down, the rest of the code never reads `process.env`.
- **`docs/api.md`:** public contract; client and code must match it.
- **Rules per layer:** details for application code, tests and Prisma live in `.claude/rules/` and load when touching those files. Full REST conventions: skill `api-conventions`.

## How do we work?

### First time

```
cp .env.example .env            # DB_PASSWORD is required by docker compose
docker compose up -d postgres
pnpm install
pnpm db:generate                # mandatory: without it tsc/dev/lint fail
pnpm db:migrate
```

### Commands

- `pnpm dev` — server with reload (`tsx watch`) on :3000
- `pnpm test` — Vitest; one file: `pnpm test -- tests/catalog.test.ts`; one test: `pnpm test -- -t "name"`
- `pnpm typecheck` — `tsc --noEmit` (includes `tests/`)
- `pnpm lint` / `pnpm format` — ESLint / Prettier
- `pnpm db:generate` — after cloning and after every change to `prisma/schema/*.prisma`
- `pnpm db:migrate` — `prisma migrate dev`
- `pnpm build` / `pnpm start` — compile to `dist/` and run

TODO: add `pnpm test:integration` (real Postgres) when issue 04 is done, and a "start a project from this template" note (issue 11).

### Verification (before considering something done)

`pnpm typecheck && pnpm lint && pnpm test`. If you changed an endpoint, status code or error code, update `docs/api.md` and the test.

### Project rules

- Relative imports with the `.js` extension (ESM); `import type` for types (`verbatimModuleSyntax`).
- Strict TypeScript: no `any`, `type` instead of `interface`, unused args prefixed with `_`. `exactOptionalPropertyTypes` is on: no explicit `undefined` in optional props (conditional spread).
- Prettier: double quotes, `;`, trailing comma, 100 columns.
- Branches `feat/…` and `fix/…`; commits with Conventional Commits.
- `.env` is gitignored: never commit it; document new variables in `.env.example` and `platform/config/env.ts`.
- Language: all documentation, code, domain terms and error messages are written in **English**.

## Agent skills

### Issue tracker

Issues and specs live as markdown in `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context (one `CONTEXT.md` + `docs/adr/` at the root). See `docs/agents/domain.md`.
