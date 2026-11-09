import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

import type { GetBook } from "../application/useCases/getBook.js";
import type { ListBooks } from "../application/useCases/listBooks.js";
import type { RegisterBook } from "../application/useCases/registerBook.js";
import type { RetireBook } from "../application/useCases/retireBook.js";
import { presentBook } from "./presenters.js";
import {
  BookListResponseSchema,
  BookParamsSchema,
  BookQuerySchema,
  BookResponseSchema,
  NewBookSchema,
} from "./schemas.js";

export const bookRoutes = (deps: {
  registerBook: RegisterBook;
  getBook: GetBook;
  listBooks: ListBooks;
  retireBook: RetireBook;
}): FastifyPluginAsync => {
  return async (instance) => {
    const app = instance.withTypeProvider<ZodTypeProvider>();

    app.post(
      "/",
      {
        schema: {
          body: NewBookSchema,
          response: { 201: BookResponseSchema },
        },
      },
      async (request, reply) => {
        const book = await deps.registerBook(request.body);
        const result = presentBook(book);
        return reply.code(201).send(result);
      },
    );

    app.get(
      "/",
      {
        schema: {
          querystring: BookQuerySchema,
          response: { 200: BookListResponseSchema },
        },
      },
      async (request, reply) => {
        const { title, author, isbn, retired } = request.query;
        const books = await deps.listBooks({
          ...(title !== undefined && { title }),
          ...(author !== undefined && { author }),
          ...(isbn !== undefined && { isbn }),
          ...(retired !== undefined && { retired }),
        });
        return reply.code(200).send(books.map(presentBook));
      },
    );

    app.get(
      "/:id",
      {
        schema: {
          params: BookParamsSchema,
          response: { 200: BookResponseSchema },
        },
      },
      async (request, reply) => {
        const book = await deps.getBook(request.params.id);
        const result = presentBook(book);
        return reply.code(200).send(result);
      },
    );

    app.post(
      "/:id/retire",
      {
        schema: {
          params: BookParamsSchema,
          response: { 200: BookResponseSchema },
        },
      },
      async (request, reply) => {
        const book = await deps.retireBook(request.params.id);
        return reply.code(200).send(presentBook(book));
      },
    );
  };
};
