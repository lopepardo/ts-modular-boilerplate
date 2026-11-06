import { z } from "zod";

/** Request body for registering a book. */
export const NewBookSchema = z.object({
  title: z.string().trim().min(1).max(200),
  author: z.string().trim().min(1).max(200),
  isbn: z.string().trim().min(1).max(32),
});

export const BookParamsSchema = z.object({ id: z.uuid() });

/** Response contract for a book: the only shape that leaves the API. */
export const BookResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  author: z.string(),
  isbn: z.string(),
  retired: z.boolean(),
});

export type BookResponse = z.infer<typeof BookResponseSchema>;
