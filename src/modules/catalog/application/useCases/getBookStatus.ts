import type { CatalogDeps } from "../deps.js";

/** What other modules may know about a Book: whether it exists and whether it is Retired. */
export type BookStatus = { exists: false } | { exists: true; retired: boolean };

export type GetBookStatus = (id: string) => Promise<BookStatus>;

export const getBookStatusUseCase = ({
  repository,
}: Pick<CatalogDeps, "repository">): GetBookStatus => {
  return async (id) => {
    const book = await repository.findById(id);
    return book ? { exists: true, retired: book.retired } : { exists: false };
  };
};
