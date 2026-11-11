import type { Book } from "../../domain/book.js";

/**
 * Search criteria, all optional and combined with AND. `title` and `author`
 * match a case-insensitive part of the text; `isbn` matches exactly.
 */
export type BookFilter = {
  title?: string;
  author?: string;
  isbn?: string;
  retired?: boolean;
};

/** Declared by the application layer, implemented in `infra`. */
export type BookRepository = {
  /** Inserts a new Book. */
  add: (book: Book) => Promise<Book>;
  /** Replaces an existing Book. Throws `NotFoundError("BOOK_NOT_FOUND")` if it no longer exists. */
  update: (book: Book) => Promise<Book>;
  findById: (id: string) => Promise<Book | null>;
  /** Ordered by title, then id, so results are stable. */
  search: (filter: BookFilter) => Promise<Book[]>;
};
