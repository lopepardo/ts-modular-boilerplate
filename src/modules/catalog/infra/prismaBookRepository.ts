import { NotFoundError } from "../../../shared/errors.js";
import { Prisma, type PrismaClient } from "../../../platform/db/generated/client.js";
import type { BookRepository } from "../application/ports/bookRepository.js";
import type { Book } from "../domain/book.js";

/** Only touches the `Book` table owned by this module. */
export const createPrismaBookRepository = (prisma: PrismaClient): BookRepository => {
  return {
    add: (book: Book) => {
      return prisma.book.create({ data: book });
    },

    update: async (book: Book) => {
      try {
        return await prisma.book.update({ where: { id: book.id }, data: book });
      } catch (error) {
        // P2025: the record to update does not exist (e.g. removed after `findById`).
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
          throw new NotFoundError("BOOK_NOT_FOUND", `Book ${book.id} not found`, {
            cause: error,
          });
        }
        throw error;
      }
    },

    findById: (id) => {
      return prisma.book.findUnique({ where: { id } });
    },

    search: ({ title, author, isbn, retired }) => {
      return prisma.book.findMany({
        where: {
          ...(title !== undefined && { title: { contains: title, mode: "insensitive" } }),
          ...(author !== undefined && { author: { contains: author, mode: "insensitive" } }),
          ...(isbn !== undefined && { isbn }),
          ...(retired !== undefined && { retired }),
        },
        orderBy: [{ title: "asc" }, { id: "asc" }],
      });
    },
  };
};
