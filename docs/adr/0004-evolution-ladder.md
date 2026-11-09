# Evolution ladder: add distribution machinery only when a need appears

The boilerplate is built so a module can become a service without rewriting its domain: only the adapters in `app.ts` and the infrastructure change. Extracting a module is never free (an in-process call becomes a network call that can fail or be slow, its data moves to another database, events need a real broker), so the machinery is added step by step, each one only when its trigger is real. Adding it earlier is the complexity this architecture exists to avoid.

| Step                | Trigger                                                     | What to add                                                                                                                                         |
| ------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Today            | Modules only need answers from each other                   | Own schema per module, ids instead of foreign keys, synchronous calls through ports wired in `app.ts`, transactions inside a module (ADR 0003)      |
| 2. Reaction         | "When X happens in A, B must do Y"                          | In-memory events: A publishes through a port, `app.ts` subscribes B. Still one process, still one transaction owner (A)                             |
| 3. Durable reaction | The reaction must not be lost if the process dies           | An outbox table in A's schema: A saves its change and the event in the same transaction; a relay delivers it to B afterwards (eventual consistency) |
| 4. Extraction       | A module needs independent scaling, deployment or ownership | Move its schema to its own database, replace the adapter in `app.ts` with an HTTP client, publish the outbox to a broker                            |

## Signals to climb

- A use case needs to write to two modules atomically: first challenge the boundary (ADR 0003); if it holds, use an event (step 2 or 3).
- `catalog` needs to ask something of `lending`: construction order in `app.ts` forbids cycles; invert it with an event instead of a second port.

## Consequences

- Queries across modules (reports) read through ports or a read-only reporting module; they never join tables across schemas in a module's `infra`.
- Calls stay synchronous and in-process until step 2 is needed. Domain events remain out of the boilerplate today.
