/** A physical copy in the catalog (see `CONTEXT.md`). */
export type Book = {
  id: string;
  title: string;
  author: string;
  isbn: string;
  retired: boolean;
};

/** Declared by the application layer, implemented in `infra`. */
export type BookRepository = {
  save: (book: Book) => Promise<Book>;
  findById: (id: string) => Promise<Book | null>;
};
