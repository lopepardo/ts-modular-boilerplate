/** What lending needs to know about a Book; `app.ts` adapts catalog's public API to this. */
export type BookAvailability = { exists: false } | { exists: true; retired: boolean };

export type BookCatalog = {
  getBookStatus: (bookId: string) => Promise<BookAvailability>;
};
