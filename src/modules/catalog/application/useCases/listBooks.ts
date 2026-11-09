import type { Book } from "../../domain/book.js";
import type { CatalogDeps } from "../deps.js";
import type { BookFilter } from "../ports/bookRepository.js";

export type ListBooks = (filter: BookFilter) => Promise<Book[]>;

/** Lists every Book, narrowed by the optional search criteria. */
export const listBooksUseCase =
  ({ repository }: Pick<CatalogDeps, "repository">): ListBooks =>
  (filter) =>
    repository.search(filter);
