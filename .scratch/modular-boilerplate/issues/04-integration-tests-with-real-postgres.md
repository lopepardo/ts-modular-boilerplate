# 04: Integration tests against real Postgres

**What to build:** `pnpm test:integration` runs the same HTTP scenarios already written for `catalog` against the real Prisma repositories on the local Postgres from `docker compose`. Each scenario is written once and shared by both wirings (in-memory and real); the default `pnpm test` still needs no database. This verifies migrations, constraints and the entity-to-row mapping.

**Blocked by:** 03

**Status:** done

- [x] A shared set of scenarios is executed with both in-memory and Prisma wiring without duplicating test cases
- [x] `pnpm test:integration` passes against the local Postgres and leaves it clean between runs
- [x] `pnpm test` runs without a database and does not execute the integration wiring
- [x] The way to run integration tests is documented where the other commands are listed
- [x] `pnpm typecheck && pnpm lint && pnpm test` pass
