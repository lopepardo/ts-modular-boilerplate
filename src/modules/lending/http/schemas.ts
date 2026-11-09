import { z } from "zod";

/** Request body for borrowing a book. The member is an opaque external id. */
export const NewLoanSchema = z.object({
  memberId: z.string().trim().min(1).max(200),
  bookId: z.uuid(),
});

/** Path parameters of `/loans/:id`. */
export const LoanParamsSchema = z.object({ id: z.uuid() });

/** Query string of `GET /loans`: optional filters. */
export const LoanQuerySchema = z.object({
  memberId: z.string().trim().min(1).max(200).optional(),
  status: z.enum(["active", "returned"]).optional(),
});

/** Response contract for a loan: the only shape that leaves the API. */
export const LoanResponseSchema = z.object({
  id: z.string(),
  bookId: z.string(),
  memberId: z.string(),
  status: z.enum(["active", "returned"]),
  overdue: z.boolean(),
  borrowedAt: z.string(),
  dueDate: z.string(),
});

export const LoanListResponseSchema = z.array(LoanResponseSchema);

export type LoanResponse = z.infer<typeof LoanResponseSchema>;
