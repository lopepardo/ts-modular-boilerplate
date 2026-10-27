import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { AppError } from "../shared/AppError.js";

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

  if (error instanceof AppError) {
    return reply.code(error.statusCode).send({
      error: {
        code: error.code,
        message: error.message,
        traceId: request.id,
      },
    });
  }

  request.log.error(error);

  return reply.code(500).send({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Unexpected server error",
      traceId: request.id,
    },
  });
};
