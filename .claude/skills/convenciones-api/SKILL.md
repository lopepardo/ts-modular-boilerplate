---
name: convenciones-api
description: REST conventions for the expenses API (routes, JSON shape, validation, error format, layering). Use when creating or modifying endpoints, validations or error responses.
---

Reference implementation: `src/routes/expenses.ts`, `src/controllers/expenses.ts`, `src/services/expenses.ts`. Public contract: `docs/api.md`.

## Naming

- Domain, fields and error messages in **English** (`expenses`, `amountCents`, `category`).
- Routes: plural, kebab-case resource (`/expenses`, `/expense-categories`). Register each resource with a `prefix` in `src/app.ts`.
- JSON in camelCase. Money is always integer **cents** (`amountCents`), never float.
- Dates in/out are `YYYY-MM-DD`; timestamps (`createdAt`) are ISO 8601. Input dates are parsed to UTC midnight `Date`.
- IDs are UUIDs, validated with `z.uuid()`.

## Layers

- `routes/`: only wires verb + path to a controller.
- `controllers/`: Zod schemas for body/query/params, plus `present()` to map the DB row to the public shape. Call `.parse()` and let errors propagate; never `try/catch` to format responses.
- `services/`: business rules and Prisma access; no Fastify imports.
- With `exactOptionalPropertyTypes`, never pass `undefined` to optional props; use conditional spread (see `listExpenses`).

## Status codes

- `POST` create: `201` with the resource. `GET`: `200`. `DELETE`: `204` with no body.
- Invalid body/query/params: `422` `VALIDATION_ERROR` (handled centrally from `ZodError`, includes `details`).
- Missing resource: `404` with a specific code, e.g. `EXPENSE_NOT_FOUND`.
- Anything unexpected: `500` `INTERNAL_SERVER_ERROR`.

## Errors

Format (built only in `src/handlers/errorHandler.ts`):

```json
{ "error": { "code": "EXPENSE_NOT_FOUND", "message": "...", "traceId": "..." } }
```

Business errors are thrown from the service: `throw new AppError(message, status, "UPPER_SNAKE_CODE")`.

## Listings

Filters are optional query params (`from`, `to`, `category`) validated with Zod. There is no pagination yet; if you add it, document it in `docs/api.md` first, then implement it consistently across listings.

## Checklist when changing the API

1. Update `docs/api.md` (routes, fields, error codes).
2. Add or adjust tests in `tests/` using the `vi.mock` + `app.inject` pattern (no DB).
3. Run `pnpm typecheck && pnpm lint && pnpm test`.
