import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

import type { GetBook } from "../application/getBook.js";
import type { RegisterBook } from "../application/registerBook.js";
import { presentBook } from "./presenters.js";
import { BookParamsSchema, BookResponseSchema, NewBookSchema } from "./schemas.js";

export const bookRoutes = (deps: {
  registerBook: RegisterBook;
  getBook: GetBook;
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
  };
};
