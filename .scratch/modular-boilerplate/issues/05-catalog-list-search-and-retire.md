# 05: Catalog: list, search and retire books

**What to build:** A librarian can list and search Books, and retire a Book so it leaves circulation without being deleted. Retiring is idempotent from the client's point of view and there is no delete operation. `catalog` exposes through its public entry point a query to check whether a Book exists and whether it is **Retired**, for other modules to use. A lint rule forbids accessing another module's tables (ADR 0003), enforced by `pnpm lint`.

**Blocked by:** 03

**Status:** done

- [x] Listing returns books and supports searching by the agreed criteria
- [x] Retiring a book marks it Retired; retiring it again succeeds without changing anything else
- [x] Retiring an unknown book returns 404
- [x] No endpoint or use case deletes a book
- [x] The public entry point exposes the existence/retired query and nothing from `domain` or `infra`
- [x] `pnpm lint` fails when a module reads or writes another module's tables (demonstrated on a deliberate violation, then removed)
- [x] Scenarios work with in-memory wiring and, once ticket 04 exists, with the real wiring
- [x] `pnpm typecheck && pnpm lint && pnpm test` pass
