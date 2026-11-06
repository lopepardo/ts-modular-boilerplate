import type { FastifyReply, FastifyRequest } from "fastify";
import { isResponseSerializationError } from "fastify-type-provider-zod";

import { toErrorResponse } from "./errorMapper.js";

export const errorHandler = (error: unknown, request: FastifyRequest, reply: FastifyReply) => {
  const { status, code, message, details } = toErrorResponse(error);

  // A custom handler gets no automatic logging from Fastify.
  if (isResponseSerializationError(error)) {
    // the handler broke its own response schema. Log only.
    request.log.error(
      { err: error, issues: error.cause.issues },
      "Response does not match its schema",
    );
  } else if (status >= 500) {
    request.log.error({ err: error }, "Unhandled error");
  } else {
    request.log.info({ status, code }, "Request failed");
  }

  return reply.code(status).send({
    error: {
      code,
      message,
      ...(details && { details }),
      traceId: request.id,
    },
  });
};
