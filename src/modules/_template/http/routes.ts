import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

import type { CreateExample } from "../application/createExample.js";
import type { Example } from "../application/exampleRepository.js";

const NewExampleSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

const present = (example: Example) => ({
  id: example.id,
  name: example.name,
});

/** HTTP boundary: validate input, call the use case, format output. */
export const exampleRoutes =
  (deps: { createExample: CreateExample }): FastifyPluginAsync =>
  async (instance) => {
    const app = instance.withTypeProvider<ZodTypeProvider>();

    app.post("/", { schema: { body: NewExampleSchema } }, async (request, reply) => {
      const example = await deps.createExample(request.body);
      return reply.code(201).send(present(example));
    });
  };
