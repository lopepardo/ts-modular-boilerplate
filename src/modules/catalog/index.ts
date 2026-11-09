import type { FastifyPluginAsync } from "fastify";

import type { CatalogDeps } from "./application/deps.js";
import { getBookUseCase } from "./application/useCases/getBook.js";
import { getBookStatusUseCase, type GetBookStatus } from "./application/useCases/getBookStatus.js";
import { listBooksUseCase } from "./application/useCases/listBooks.js";
import { retireBookUseCase } from "./application/useCases/retireBook.js";
import { registerBookUseCase } from "./application/useCases/registerBook.js";
import { bookRoutes } from "./http/routes.js";

/*
 * Public surface, consumed only by the composition root (app.ts) and tests:
 * modules never import each other (ADR 0001). Entities from `domain` are not
 * exported; callers get them through the use cases' return types.
 */
export type { BookStatus } from "./application/useCases/getBookStatus.js";
export { createPrismaBookRepository } from "./infra/prismaBookRepository.js";

/** Expose only what a consumer uses today: add a use case here when another module needs it. */
export type CatalogModule = {
  routes: FastifyPluginAsync;
  /** Whether a Book exists and is Retired; the only thing other modules need to know. */
  getBookStatus: GetBookStatus;
};

/** Public entry point of the catalog module. */
export const createCatalogModule = (deps: CatalogDeps): CatalogModule => {
  return {
    routes: bookRoutes({
      registerBook: registerBookUseCase(deps),
      getBook: getBookUseCase(deps),
      listBooks: listBooksUseCase(deps),
      retireBook: retireBookUseCase(deps),
    }),
    getBookStatus: getBookStatusUseCase(deps),
  };
};
