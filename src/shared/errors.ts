/**
 * Business errors describe what went wrong in domain terms. They know nothing
 * about HTTP: the central error handler decides the status code.
 */
export class BusinessError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** The requested resource does not exist. */
export class NotFoundError extends BusinessError {}

/** The operation conflicts with the current state of a resource. */
export class ConflictError extends BusinessError {}
