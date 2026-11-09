# 04: Integration tests against real Postgres

**What to build:** `pnpm test` runs the HTTP scenarios for `catalog` against the real Prisma repositories on the local Postgres from `docker compose`. There is a single wiring: no in-memory repositories and no separate integration command. This verifies migrations, constraints and the entity-to-row mapping.

**Blocked by:** 03

**Status:** done

- [x] Scenarios are executed only against the Prisma wiring on real Postgres; no in-memory repositories exist
- [x] `pnpm test` passes against the local Postgres and each test deletes only the rows it created
- [x] `pnpm test` requires `docker compose up -d postgres` and `pnpm db:migrate`
- [x] The Postgres requirement for tests is documented where the other commands are listed
- [x] `pnpm typecheck && pnpm lint && pnpm test` pass
