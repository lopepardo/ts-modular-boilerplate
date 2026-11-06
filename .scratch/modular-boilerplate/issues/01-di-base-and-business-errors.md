# 01: DI base and business errors

**What to build:** The app builder accepts every dependency (repositories, clock, id generator) as overrides and creates the real ones by default, making it the single composition root (ADR 0002). Global infrastructure moves under a `platform` area (environment validation, database client, HTTP plugins) and cross-cutting primitives under `shared`. Business errors carry a `code` and `message` without any HTTP knowledge; the central error handler maps them to status codes while keeping the `{ error: { code, message, traceId } }` shape and the 400 `VALIDATION_ERROR` mapping for Zod validation errors. The existing `expenses` resource and `/health` keep working through the new wiring (expand step; `expenses` is removed later in ticket 10).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] The app builder accepts dependency overrides and still works with no arguments
- [x] A test builds the app with a fixed clock and an in-memory/fake dependency and drives it through `app.inject`
- [x] Business errors have no `statusCode`; the error handler maps them to HTTP responses with the unchanged error format
- [x] Validation errors return 400 `VALIDATION_ERROR` with `details`; unknown errors still return 500
- [x] `/health` and all existing `expenses` behavior and tests remain green
- [x] `pnpm typecheck && pnpm lint && pnpm test` pass
