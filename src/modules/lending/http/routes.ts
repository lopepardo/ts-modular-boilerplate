import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

import type { ReturnLoan } from "../application/useCases/returnLoan.js";
import type { BorrowBook } from "../application/useCases/borrowBook.js";
import { presentLoan } from "./presenters.js";
import { LoanParamsSchema, LoanResponseSchema, NewLoanSchema } from "./schemas.js";

export const loanRoutes = (deps: {
  borrowBook: BorrowBook;
  returnLoan: ReturnLoan;
}): FastifyPluginAsync => {
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

    app.post(
      "/:id/return",
      {
        schema: {
          params: LoanParamsSchema,
          response: { 200: LoanResponseSchema },
        },
      },
      async (request, reply) => {
        const loan = await deps.returnLoan(request.params.id);
        const result = presentLoan(loan);
        return reply.code(200).send(result);
      },
    );
  };
};
