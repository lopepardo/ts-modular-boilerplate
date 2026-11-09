import type { FastifyPluginAsync } from "fastify";

import type { LendingDeps } from "./application/deps.js";
import { borrowBookUseCase } from "./application/useCases/borrowBook.js";
import { returnLoanUseCase } from "./application/useCases/returnLoan.js";
import { loanRoutes } from "./http/routes.js";

/*
 * Public surface, consumed only by the composition root (app.ts) and tests:
 * modules never import each other (ADR 0001). Lending reaches catalog through
 * the `BookCatalog` port, adapted in app.ts.
 */
export type { BookAvailability, BookCatalog } from "./application/ports/bookCatalog.js";
export { createPrismaLoanRepository } from "./infra/prismaLoanRepository.js";

/** No other module consumes lending yet: expose a use case here when one does. */
export type LendingModule = {
  routes: FastifyPluginAsync;
};

/** Public entry point of the lending module. */
export const createLendingModule = (deps: LendingDeps): LendingModule => {
  return {
    routes: loanRoutes({
      borrowBook: borrowBookUseCase(deps),
      returnLoan: returnLoanUseCase(deps),
    }),
  };
};
