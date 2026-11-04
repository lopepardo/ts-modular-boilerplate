import type { PrismaClient } from "../../../platform/db/generated/client.js";
import type { Book, BookRepository } from "../application/bookRepository.js";

/** Only touches the `Book` table owned by this module (ADR 0003). */
export const createPrismaBookRepository = (
  prisma: PrismaClient,
): BookRepository => {
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
  };
};
