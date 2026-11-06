import type { FastifyPluginAsync } from "fastify";

import type { CatalogDeps } from "./application/deps.js";
import { getBookUseCase, type GetBook } from "./application/useCases/getBook.js";
import { registerBookUseCase, type RegisterBook } from "./application/useCases/registerBook.js";
import { bookRoutes } from "./http/routes.js";

export type { BookRepository } from "./application/ports/bookRepository.js";
export type { Book } from "./domain/book.js";
export { createInMemoryBookRepository } from "./infra/inMemoryBookRepository.js";
export { createPrismaBookRepository } from "./infra/prismaBookRepository.js";

export type CatalogModule = {
  routes: FastifyPluginAsync;

  /* public API */
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
