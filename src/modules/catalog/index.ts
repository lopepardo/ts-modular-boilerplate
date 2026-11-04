import type { FastifyPluginAsync } from "fastify";

import { getBookUseCase, type GetBook } from "./application/getBook.js";
import {
  registerBookUseCase,
  type CatalogDeps,
  type RegisterBook,
} from "./application/registerBook.js";
import { bookRoutes } from "./http/routes.js";

export type { Book, BookRepository } from "./application/bookRepository.js";
export { createInMemoryBookRepository } from "./infra/inMemoryBookRepository.js";
export { createPrismaBookRepository } from "./infra/prismaBookRepository.js";

export type CatalogModule = {
  routes: FastifyPluginAsync;
  registerBook: RegisterBook;
  getBook: GetBook;
};

/** Public entry point of the catalog module. */
export const createCatalogModule = (deps: CatalogDeps): CatalogModule => {
  const registerBook = registerBookUseCase(deps);
  const getBook = getBookUseCase(deps.repository);

  return {
    routes: bookRoutes({ registerBook, getBook }),
    registerBook,
    getBook,
  };
};
