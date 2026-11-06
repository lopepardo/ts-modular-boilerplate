import type { Book } from "../../domain/book.js";

/** Declared by the application layer, implemented in `infra`. */
export type BookRepository = {
  save: (book: Book) => Promise<Book>;
  findById: (id: string) => Promise<Book | null>;
};
