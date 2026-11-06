import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

import type { CreateExample } from "../application/createExample.js";
import { presentExample } from "./presenters.js";
import { ExampleResponseSchema, NewExampleSchema } from "./schemas.js";

/** HTTP boundary: validate input, call the use case, format output. */
export const exampleRoutes =
  (deps: { createExample: CreateExample }): FastifyPluginAsync =>
  async (instance) => {
    const app = instance.withTypeProvider<ZodTypeProvider>();

    app.post(
      "/",
      {
        schema: {
          body: NewExampleSchema,
          response: { 201: ExampleResponseSchema },
        },
      },
      async (request, reply) => {
        const example = await deps.createExample(request.body);
        return reply.code(201).send(presentExample(example));
      },
    );
  };
