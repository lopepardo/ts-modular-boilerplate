import type { Example } from "../../domain/example.js";

/** Declared by the application layer, implemented in `infra`. */
export type ExampleRepository = {
  save: (example: Example) => Promise<Example>;
};
