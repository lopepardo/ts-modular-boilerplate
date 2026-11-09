import type { FastifyPluginAsync } from "fastify";

import type { CatalogDeps } from "./application/deps.js";
import { getBookUseCase, type GetBook } from "./application/useCases/getBook.js";
import { registerBookUseCase, type RegisterBook } from "./application/useCases/registerBook.js";
import { bookRoutes } from "./http/routes.js";

/*
 * Public surface, consumed only by the composition root (app.ts) and tests:
 * modules never import each other (ADR 0001). Entities from `domain` are not
 * exported; callers get them through the use cases' return types.
 */
export type { BookRepository } from "./application/ports/bookRepository.js";
export { createInMemoryBookRepository } from "./infra/inMemoryBookRepository.js";
export { createPrismaBookRepository } from "./infra/prismaBookRepository.js";

export type CatalogModule = {
  routes: FastifyPluginAsync;

  /* Use cases that app.ts may adapt to other modules' ports */
  getBook: GetBook;
  registerBook: RegisterBook;
};

/** Public entry point of the catalog module. */
export const createCatalogModule = (deps: CatalogDeps): CatalogModule => {
  const getBook = getBookUseCase(deps);
  const registerBook = registerBookUseCase(deps);

  return {
    routes: bookRoutes({ registerBook, getBook }),
    getBook,
    registerBook,
  };
};
