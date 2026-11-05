import type { z } from "zod";

/**
 * Raised only by `parseInput`, i.e. when the *client's* input is invalid.
 * A bare ZodError thrown anywhere else (service, repository) is a server
 * fault (500) and must not be reported as a client error.
 */
export class RequestValidationError extends Error {
  constructor(public readonly issues: readonly z.core.$ZodIssue[]) {
    super("Invalid request data");
    this.name = "RequestValidationError";
  }
}

/** Validates untrusted HTTP input; throws `RequestValidationError`. */
export const parseInput = <T extends z.ZodType>(schema: T, data: unknown): z.output<T> => {
  const result = schema.safeParse(data);
  if (!result.success) throw new RequestValidationError(result.error.issues);
  return result.data;
};
