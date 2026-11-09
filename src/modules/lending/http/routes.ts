import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

import type { Clock } from "../../../shared/clock.js";
import type { GetLoan } from "../application/useCases/getLoan.js";
import type { ListLoans } from "../application/useCases/listLoans.js";
import type { ReturnLoan } from "../application/useCases/returnLoan.js";
import type { BorrowBook } from "../application/useCases/borrowBook.js";
import { presentLoan } from "./presenters.js";
import {
  LoanListResponseSchema,
  LoanParamsSchema,
  LoanQuerySchema,
  LoanResponseSchema,
  NewLoanSchema,
} from "./schemas.js";

export const loanRoutes = (deps: {
  borrowBook: BorrowBook;
  returnLoan: ReturnLoan;
  getLoan: GetLoan;
  listLoans: ListLoans;
  clock: Clock;
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
        const result = presentLoan(loan, deps.clock.now());
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
        const result = presentLoan(loan, deps.clock.now());
        return reply.code(200).send(result);
      },
    );

    app.get(
      "/",
      {
        schema: {
          querystring: LoanQuerySchema,
          response: { 200: LoanListResponseSchema },
        },
      },
      async (request, reply) => {
        const { memberId, status } = request.query;
        const loans = await deps.listLoans({
          ...(memberId !== undefined && { memberId }),
          ...(status !== undefined && { status }),
        });
        const now = deps.clock.now();
        const result = loans.map((loan) => presentLoan(loan, now));
        return reply.code(200).send(result);
      },
    );

    app.get(
      "/:id",
      {
        schema: {
          params: LoanParamsSchema,
          response: { 200: LoanResponseSchema },
        },
      },
      async (request, reply) => {
        const loan = await deps.getLoan(request.params.id);
        const result = presentLoan(loan, deps.clock.now());
        return reply.code(200).send(result);
      },
    );
  };
};
