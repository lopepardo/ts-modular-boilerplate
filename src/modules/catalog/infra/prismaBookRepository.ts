import type { PrismaClient } from "../../../platform/db/generated/client.js";
import type { BookRepository } from "../application/ports/bookRepository.js";
import type { Book } from "../domain/book.js";

/** Only touches the `Book` table owned by this module. */
export const createPrismaBookRepository = (prisma: PrismaClient): BookRepository => {
  return {
    save: (book: Book) => {
      return prisma.book.upsert({
        where: { id: book.id },
        create: book,
        update: book,
      });
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
