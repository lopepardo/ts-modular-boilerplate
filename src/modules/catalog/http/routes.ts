import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import type { Book } from "../application/bookRepository.js";
import type { GetBook } from "../application/getBook.js";
import type { RegisterBook } from "../application/registerBook.js";

const NewBookSchema = z.object({
  title: z.string().trim().min(1).max(200),
  author: z.string().trim().min(1).max(200),
  isbn: z.string().trim().min(1).max(32),
});

const ParamsSchema = z.object({ id: z.uuid() });

const present = (book: Book) => ({
  id: book.id,
  title: book.title,
  author: book.author,
  isbn: book.isbn,
  retired: book.retired,
});

export const bookRoutes = (deps: {
  registerBook: RegisterBook;
  getBook: GetBook;
}): FastifyPluginAsync => {
  return async (app) => {
    app.post("/", async (request, reply) => {
      const input = NewBookSchema.parse(request.body);
      const book = await deps.registerBook(input);
      return reply.code(201).send(present(book));
    });

    app.get("/:id", async (request) => {
      const { id } = ParamsSchema.parse(request.params);
      return present(await deps.getBook(id));
    });
  };
};
