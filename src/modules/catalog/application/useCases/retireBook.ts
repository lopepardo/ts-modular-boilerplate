import { NotFoundError } from "../../../../shared/errors.js";
import type { Book } from "../../domain/book.js";
import type { CatalogDeps } from "../deps.js";

export type RetireBook = (id: string) => Promise<Book>;

/** Idempotent: retiring a Retired Book succeeds and changes nothing. Books are never deleted. */
export const retireBookUseCase = ({ repository }: Pick<CatalogDeps, "repository">): RetireBook => {
  return async (id) => {
    const book = await repository.findById(id);
    if (!book) {
      throw new NotFoundError("BOOK_NOT_FOUND", `Book ${id} not found`);
    }
    if (book.retired) {
      return book;
    }
    return repository.update({ ...book, retired: true });
  };
};
