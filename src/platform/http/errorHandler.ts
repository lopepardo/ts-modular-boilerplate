import type { FastifyReply, FastifyRequest } from "fastify";

import { toErrorResponse } from "./errorMapper.js";

export const errorHandler = (error: unknown, request: FastifyRequest, reply: FastifyReply) => {
  const { status, code, message, details } = toErrorResponse(error);

  // A custom handler gets no automatic logging from Fastify.
  if (status >= 500) {
    request.log.error({ err: error }, "Unhandled error");
  } else {
    request.log.info({ code, status }, "Request failed");
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
