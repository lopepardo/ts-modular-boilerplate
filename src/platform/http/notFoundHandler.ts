import type { FastifyReply, FastifyRequest } from "fastify";

export const notFoundHandler = (request: FastifyRequest, reply: FastifyReply) => {
  return reply.code(404).send({
    error: {
      code: "ROUTE_NOT_FOUND",
      message: "Route not found",
      traceId: request.id,
    },
  });
};
