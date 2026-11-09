import type { Book } from "../domain/book.js";
import type { BookFilter, BookRepository } from "../application/ports/bookRepository.js";

const includes = (text: string, part: string) => text.toLowerCase().includes(part.toLowerCase());

/** Same order as the Prisma repository: title, then id. */
const compareBooks = (a: Book, b: Book) =>
  a.title.localeCompare(b.title) || a.id.localeCompare(b.id);

export const createInMemoryBookRepository = (): BookRepository => {
  const store = new Map<string, Book>();

  return {
    save: async (book) => {
      store.set(book.id, book);
      return book;
    },
    findById: async (id) => store.get(id) ?? null,
    search: async ({ title, author, isbn, retired }: BookFilter) =>
      [...store.values()]
        .filter(
          (book) =>
            (title === undefined || includes(book.title, title)) &&
            (author === undefined || includes(book.author, author)) &&
            (isbn === undefined || book.isbn === isbn) &&
            (retired === undefined || book.retired === retired),
        )
        .sort(compareBooks),
  };
};
