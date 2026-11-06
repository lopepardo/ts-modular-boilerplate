import type { Book } from "../domain/book.js";
import type { BookResponse } from "./schemas.js";

/** Maps the domain entity to the public DTO. */
export const presentBook = (book: Book): BookResponse => ({
  id: book.id,
  title: book.title,
  author: book.author,
  isbn: book.isbn,
  retired: book.retired,
});
