import type { Book } from "../../domain/book.js";
import type { CatalogDeps } from "../deps.js";

export type RegisterBook = (input: {
  title: string;
  author: string;
  isbn: string;
}) => Promise<Book>;

/** Every registration creates a new Book, even for an ISBN already present. */
export const registerBookUseCase = ({
  repository,
  generateId,
}: Pick<CatalogDeps, "repository" | "generateId">): RegisterBook => {
  return (input) => {
    const id = generateId();
    return repository.save({ id, ...input, retired: false });
  };
};
