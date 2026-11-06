import type { IdGenerator } from "../../../shared/ids.js";
import type { BookRepository } from "./ports/bookRepository.js";

/** Everything the catalog module needs from the outside (ports, never implementations). */
export type CatalogDeps = {
  repository: BookRepository;
  generateId: IdGenerator;
};
