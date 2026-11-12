import type { FastifyPluginAsync } from "fastify";

import type { LendingDeps } from "./application/deps.js";
import { borrowBookUseCase } from "./application/useCases/borrowBook.js";
import { getLoanUseCase } from "./application/useCases/getLoan.js";
import { listLoansUseCase } from "./application/useCases/listLoans.js";
import { returnLoanUseCase } from "./application/useCases/returnLoan.js";
import { loanRoutes } from "./http/routes.js";

/*
 * Public surface, used only by app.ts and tests (modules never import each other).
 * Lending reaches catalog through the `BookCatalog` port, adapted in app.ts.
 */
export type { BookAvailability, BookCatalog } from "./application/ports/bookCatalog.js";
export { createPrismaLoanRepository } from "./infra/prismaLoanRepository.js";

/** No other module consumes lending yet: expose a use case here when one does. */
export type LendingModule = {
  routes: FastifyPluginAsync;
};

export const createLendingModule = (deps: LendingDeps): LendingModule => {
  return {
    routes: loanRoutes({
      borrowBook: borrowBookUseCase(deps),
      returnLoan: returnLoanUseCase(deps),
      getLoan: getLoanUseCase(deps),
      listLoans: listLoansUseCase(deps),
      clock: deps.clock,
    }),
  };
};
