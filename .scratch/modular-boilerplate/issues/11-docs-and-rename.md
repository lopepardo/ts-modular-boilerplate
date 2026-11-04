# 11: Documentation and project rename

**What to build:** The project documentation describes the new structure: `CLAUDE.md` (folder map, why each part exists, commands including `pnpm test:integration`), the layer rules under `.claude/rules/`, the API contract document, and the manual request collection, all matching the library endpoints and error codes actually implemented. The project takes a generic name. Documentation, code, domain and error messages are all written in English. The first-time setup commands work from a fresh checkout.

**Blocked by:** 04, 08, 09, 10

**Status:** ready-for-agent

- [ ] `CLAUDE.md` and `.claude/rules/` describe modules, layers, DI, boundaries and data ownership, consistent with ADR 0001–0003
- [ ] The API contract document matches the implemented `catalog` and `lending` endpoints, status codes and error codes
- [ ] The request collection covers the library endpoints
- [ ] Package and project names are generic, with no references to "Gastos" or expenses
- [ ] A fresh checkout following the documented first-time steps reaches a green `pnpm typecheck && pnpm lint && pnpm test`
- [ ] A note explains how to start a project from the template: delete the example modules and copy the template module
