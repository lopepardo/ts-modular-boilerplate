# Expenses API

Personal expenses REST API. Domain and error messages in **English** (`expenses`, `amountCents`, `category`…); keep it that way. Today only the `expenses` resource exists (+ `GET /health`).

**Stack:** Node + TypeScript ESM (`nodenext`, `strict`), Fastify 5, Prisma 7 (`prisma-client` + `@prisma/adapter-pg`) on PostgreSQL 18, Zod 4, Vitest, ESLint (typescript-eslint type-checked) + Prettier, pnpm.

**Folder map:**

```
src/
  main.ts            startup: buildApp() + listen (0.0.0.0:env.PORT)
  app.ts             buildApp(overrides): composition root (ADR 0002)
  routes/            Fastify plugin factories: bind verb+path → controller
  controllers/       Zod schemas (body/query/params) and present()
  services/          business logic (createXService(repository))
  repositories/      data access interfaces + Prisma implementations
  platform/          config/env.ts, db/client.ts (+ generated/), http/ (errorHandler, plugins)
  shared/            BusinessError/NotFoundError/ConflictError, Clock, IdGenerator
prisma/              schema.prisma + migrations/
tests/               *.test.ts (Vitest, no DB); support/ = in-memory fakes
docs/api.md          endpoint contract
docs/api/            request collection (OpenCollection/Bruno) for manual testing
prisma.config.ts     Prisma CLI config
docker-compose.yml   local Postgres
```

## Why does each part exist?

- **routes → controllers → services:** each layer has a single responsibility. Routes = wiring; controllers = HTTP boundary (validate input, format output); services = rules and data, with no knowledge of Fastify.
- **`BusinessError` + `errorHandler`:** business errors carry only `code` and `message`; a single place maps them to HTTP and decides the format `{ error: { code, message, traceId } }`. `ZodError` → 422 `VALIDATION_ERROR` (with `details`), `NotFoundError` → 404, `ConflictError` → 409, other `BusinessError` → 422, anything else → 500. That is why handlers only `.parse()` and throw; they do not catch errors.
- **`buildApp()` separate from `main.ts`:** allows tests with `app.inject` without opening a port.
- **`platform/config/env.ts`:** fails fast (`process.exit(1)`) if the environment is invalid; the rest of the code imports `env`, never `process.env`.
- **`docs/api.md`:** public contract; client and code must match it.
- **Rules per layer:** the details for services, tests and Prisma live in `.claude/rules/` and are loaded when touching those files. Full REST conventions: skill `api-conventions`.

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
- `pnpm test` — Vitest; one file: `pnpm test -- tests/expenses.test.ts`; one test: `pnpm test -- -t "name"`
- `pnpm typecheck` — `tsc --noEmit` (includes `tests/`)
- `pnpm lint` / `pnpm format` — ESLint / Prettier
- `pnpm db:generate` — after cloning and after every change to `schema.prisma`
- `pnpm db:migrate` — `prisma migrate dev`
- `pnpm build` / `pnpm start` — compile to `dist/` and run

### Verification (before considering something done)

`pnpm typecheck && pnpm lint && pnpm test`. If you changed an endpoint, update `docs/api.md`.

### Project rules

- Relative imports with the `.js` extension (ESM); `import type` for types (`verbatimModuleSyntax`).
- Strict TypeScript: no `any`, `type` instead of `interface`, unused args prefixed with `_`. `exactOptionalPropertyTypes` is on: no explicit `undefined` in optional props (conditional spread).
- Prettier: double quotes, `;`, trailing comma, 80 columns.
- Branches `feat/…` and `fix/…`; commits with Conventional Commits.
- `.env` is gitignored: never commit it; document new variables in `.env.example` and `platform/config/env.ts`.
- Language: all documentation, code, domain terms and error messages are written in **English**.

## Agent skills

### Issue tracker

Issues and specs live as markdown in `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context (one `CONTEXT.md` + `docs/adr/` at the root). See `docs/agents/domain.md`.
