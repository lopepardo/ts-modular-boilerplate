# 10: Remove the expenses resource

**What to build:** The `expenses` resource is deleted (contract step): its routes, controller, service, tests, table and migration. The migration history is reset on top of the library schema so the repo starts clean, with no tag or backup of the old code. After this, the only business modules are the library ones.

**Blocked by:** 03

**Status:** ready-for-agent

- [x] No `expenses` code, tests, table or migration remains
- [x] The migration history applies cleanly from an empty database and creates the `catalog` tables
- [x] `/health` and all `catalog` scenarios remain green
- [x] No references to expenses remain in code or config (documentation is handled in ticket 11)
- [x] `pnpm typecheck && pnpm lint && pnpm test` pass
