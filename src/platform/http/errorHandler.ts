import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  BusinessError,
  ConflictError,
  NotFoundError,
} from "../../shared/errors.js";

const statusFor = (error: BusinessError): number => {
  if (error instanceof NotFoundError) return 404;
  if (error instanceof ConflictError) return 409;
  return 422;
};

export const errorHandler = (
  error: Error,
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  if (error instanceof z.ZodError) {
    return reply.status(422).send({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
        details: z.flattenError(error).fieldErrors,
        traceId: request.id,
      },
    });
  }

  if (error instanceof BusinessError) {
    return reply.code(statusFor(error)).send({
      error: {
        code: error.code,
        message: error.message,
        traceId: request.id,
      },
    });
  }

  request.log.error({ err: error }, "Unhandled error");

  return reply.code(500).send({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Unexpected server error",
      traceId: request.id,
    },
  });
};
