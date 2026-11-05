import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { parseInput } from "../../../platform/http/requestValidation.js";
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
  async (app) => {
    app.post("/", async (request, reply) => {
      const input = parseInput(NewExampleSchema, request.body);
      const example = await deps.createExample(input);
      return reply.code(201).send(present(example));
    });
  };
