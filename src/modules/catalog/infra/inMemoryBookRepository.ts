import type { Book, BookRepository } from "../application/bookRepository.js";

export const createInMemoryBookRepository = (): BookRepository => {
  const store = new Map<string, Book>();

  return {
    save: async (book) => {
      store.set(book.id, book);
      return book;
    },
    findById: async (id) => store.get(id) ?? null,
  };
};
