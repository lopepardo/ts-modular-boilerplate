import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

import type { BorrowBook } from "../application/useCases/borrowBook.js";
import { presentLoan } from "./presenters.js";
import { LoanResponseSchema, NewLoanSchema } from "./schemas.js";

export const loanRoutes = (deps: { borrowBook: BorrowBook }): FastifyPluginAsync => {
  return async (instance) => {
    const app = instance.withTypeProvider<ZodTypeProvider>();

    app.post(
      "/",
      {
        schema: {
          body: NewLoanSchema,
          response: { 201: LoanResponseSchema },
        },
      },
      async (request, reply) => {
        const loan = await deps.borrowBook(request.body);
        const result = presentLoan(loan);
        return reply.code(201).send(result);
      },
    );
  };
};
