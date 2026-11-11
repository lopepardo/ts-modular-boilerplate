import { NotFoundError } from "../../../../shared/errors.js";
import type { Book } from "../../domain/book.js";
import type { CatalogDeps } from "../deps.js";

export type GetBook = (id: string) => Promise<Book>;

export const getBookUseCase = ({ repository }: Pick<CatalogDeps, "repository">): GetBook => {
  return async (id) => {
    const book = await repository.findById(id);
    if (!book) {
      throw new NotFoundError("BOOK_NOT_FOUND", `Book ${id} not found`);
    }
    return book;
  };
};
