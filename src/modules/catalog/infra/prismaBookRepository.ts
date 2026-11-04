import type { PrismaClient } from "../../../platform/db/generated/client.js";
import type { Book, BookRepository } from "../application/bookRepository.js";

/** Only touches the `Book` table owned by this module (ADR 0003). */
export const createPrismaBookRepository = (
  prisma: PrismaClient,
): BookRepository => ({
  save: (book: Book) =>
    prisma.book.upsert({
      where: { id: book.id },
      create: book,
      update: book,
    }),
  findById: (id) => prisma.book.findUnique({ where: { id } }),
});
