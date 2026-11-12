import type { FastifyPluginAsync } from "fastify";

import type { CatalogDeps } from "./application/deps.js";
import { getBookUseCase } from "./application/useCases/getBook.js";
import { getBookStatusUseCase, type GetBookStatus } from "./application/useCases/getBookStatus.js";
import { listBooksUseCase } from "./application/useCases/listBooks.js";
import { retireBookUseCase } from "./application/useCases/retireBook.js";
import { registerBookUseCase } from "./application/useCases/registerBook.js";
import { bookRoutes } from "./http/routes.js";

/*
 * Public surface, used only by app.ts and tests (modules never import each other).
 * Expose only what a consumer uses today; `domain` types travel in the use cases' return types.
 */
export type { BookStatus } from "./application/useCases/getBookStatus.js";
export { createPrismaBookRepository } from "./infra/prismaBookRepository.js";

export type CatalogModule = {
  routes: FastifyPluginAsync;
  /** Whether a Book exists and is Retired: all other modules need to know. */
  getBookStatus: GetBookStatus;
};

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
