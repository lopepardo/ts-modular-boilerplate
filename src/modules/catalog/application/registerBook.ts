import type { IdGenerator } from "../../../shared/ids.js";
import type { Book, BookRepository } from "./bookRepository.js";

export type CatalogDeps = {
  repository: BookRepository;
  generateId: IdGenerator;
};

export type RegisterBook = (input: {
  title: string;
  author: string;
  isbn: string;
}) => Promise<Book>;

/** Every registration creates a new Book, even for an ISBN already present. */
export const registerBookUseCase = ({
  repository,
  generateId,
}: CatalogDeps): RegisterBook => {
  return (input) => {
    const id = generateId();
    return repository.save({ id, ...input, retired: false });
  };
};
