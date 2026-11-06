---
name: api-conventions
description: REST conventions for this modular API (routes, JSON shape, validation, error format, module layering). Use when creating or modifying endpoints, validations or error responses.
disable-model-invocation: true
---

Reference implementation: `src/modules/catalog/` (`http/routes.ts`, `application/useCases/registerBook.ts`, `index.ts`), wired in `src/app.ts`. Starting point for a new module: `src/modules/_template/`. Public contract: `docs/api.md`.

## Naming

- Domain, fields and error messages in **English**.
- Routes: plural, kebab-case resource (`/books`, `/loans`). Register each module's routes with a `prefix` in `src/app.ts`.
- JSON in camelCase. Money, if any, is always integer **cents**, never float.
- Dates in/out are `YYYY-MM-DD`; timestamps are ISO 8601.
- IDs are UUIDs, validated with `z.uuid()`.

## Layers (per module)

- `http/`: Fastify routes, Zod schemas for body/query/params (via `ZodTypeProvider`), and presenters (e.g. `presentBook`) to map the entity to the public shape. Let errors propagate; never `try/catch` to format responses.
- `application/`: `useCases/` (factory functions that receive their dependencies), `ports/` (repository interfaces) and `deps.ts` (the module's dependency type). Entities live in `domain/`. No Fastify, Zod or Prisma imports.
- `domain/`: entities and rules, only once the module has real invariants.
- `infra/`: Prisma and in-memory repository implementations.
- `index.ts`: the module's only public entry point; other modules import nothing else.
- With `exactOptionalPropertyTypes`, never pass `undefined` to optional props; use conditional spread.

## Status codes

- `POST` create: `201` with the resource. `GET`: `200`. `DELETE`: `204` with no body.
- Invalid body/query/params: `400` `VALIDATION_ERROR` (from schema validation, includes `details`).
- Missing resource: `404` with a specific code, e.g. `BOOK_NOT_FOUND` (`NotFoundError`).
- Conflict with current state: `409` (`ConflictError`).
- Other business-rule failure (plain `BusinessError`): `422`.
- Anything unexpected: `500` `INTERNAL_SERVER_ERROR`.

## Errors

Format (built only in `src/platform/http/errorHandler.ts`, mapped in `errorMapper.ts`):

```json
{ "error": { "code": "BOOK_NOT_FOUND", "message": "...", "traceId": "..." } }
```

Business errors are thrown from use cases, with no HTTP knowledge: `throw new NotFoundError("BOOK_NOT_FOUND", "Book not found")` (classes in `src/shared/errors.ts`; constructor is `(code, message)`).

## Listings

Filters are optional query params validated with Zod. There is no pagination yet; if you add it, document it in `docs/api.md` first, then implement it consistently across listings.

## Checklist when changing the API

1. Update `docs/api.md` (routes, fields, status and error codes).
2. Add or adjust tests in `tests/` using `buildApp({ config: testConfig, prisma: fakePrisma, <module>: { repository } })` + `app.inject` (no DB). See `tests/catalog.test.ts`.
3. Run `pnpm typecheck && pnpm lint && pnpm test`.
