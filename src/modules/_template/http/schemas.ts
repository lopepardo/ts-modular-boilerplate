import { z } from "zod";

export const NewExampleSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

/** Response contract: the only shape that leaves the API. */
export const ExampleResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export type ExampleResponse = z.infer<typeof ExampleResponseSchema>;
