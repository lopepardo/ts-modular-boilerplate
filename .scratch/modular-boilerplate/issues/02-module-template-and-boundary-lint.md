# 02: Module template and boundary lint rules

**What to build:** An empty, copyable module scaffold with the four layers (`http`, `application`, `domain`, `infra`), a repository type, one use case, a single public entry point and one example test, so a new module can be created by copying and renaming it. Lint rules make the boundaries real: a module cannot import another module's internals (only its public entry point), and `application`/`domain` code cannot import `http` or `infra` (ADR 0001).

**Blocked by:** 01

**Status:** ready-for-agent

- [x] The template module is wired into the app builder and its example test passes without a database
- [x] `pnpm lint` fails when a module imports another module's internal files
- [x] `pnpm lint` fails when `application` or `domain` code imports from `http` or `infra`
- [x] Both lint rules are demonstrated to fail on a deliberate violation (then removed)
- [x] The template contains no leftovers of the library example domain
- [x] `pnpm typecheck && pnpm lint && pnpm test` pass
