import type { IdGenerator } from "../../../shared/ids.js";
import type { ExampleRepository } from "./ports/exampleRepository.js";

/** Everything the module needs from the outside (ports, never implementations). */
export type TemplateDeps = {
  repository: ExampleRepository;
  generateId: IdGenerator;
};
