import type { Clock } from "../../../shared/clock.js";
import type { IdGenerator } from "../../../shared/ids.js";
import type { BookCatalog } from "./ports/bookCatalog.js";
import type { LoanRepository } from "./ports/loanRepository.js";

/** Everything the lending module needs from the outside (ports, never implementations). */
export type LendingDeps = {
  repository: LoanRepository;
  bookCatalog: BookCatalog;
  generateId: IdGenerator;
  clock: Clock;
};
