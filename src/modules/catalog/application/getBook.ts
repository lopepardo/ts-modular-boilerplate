import { NotFoundError } from "../../../shared/errors.js";
import type { Book, BookRepository } from "./bookRepository.js";

export type GetBook = (id: string) => Promise<Book>;

export const getBookUseCase =
  (repository: BookRepository): GetBook =>
  async (id) => {
    const book = await repository.findById(id);
    if (!book) {
      throw new NotFoundError("BOOK_NOT_FOUND", `Book ${id} not found`);
    }
    return book;
  };
