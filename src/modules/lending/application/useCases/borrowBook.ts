import { ConflictError, NotFoundError } from "../../../../shared/errors.js";
import { borrow, type Loan } from "../../domain/loan.js";
import type { LendingDeps } from "../deps.js";

export type BorrowBook = (input: { memberId: string; bookId: string }) => Promise<Loan>;

/** A Member borrows a Book that exists, is not Retired and has no active Loan, within the Member rules. */
export const borrowBookUseCase =
  ({
    repository,
    bookCatalog,
    generateId,
    clock,
  }: Pick<LendingDeps, "repository" | "bookCatalog" | "generateId" | "clock">): BorrowBook =>
  async ({ memberId, bookId }) => {
    const book = await bookCatalog.getBookStatus(bookId);
    if (!book.exists) {
      throw new NotFoundError("BOOK_NOT_FOUND", `Book ${bookId} not found`);
    }
    if (book.retired) {
      throw new ConflictError("BOOK_RETIRED", `Book ${bookId} is retired and cannot be lent`);
    }

    return repository.openLoan(memberId, (memberActiveLoans) =>
      borrow({ id: generateId(), bookId, memberId, now: clock.now() }, memberActiveLoans),
    );
  };
