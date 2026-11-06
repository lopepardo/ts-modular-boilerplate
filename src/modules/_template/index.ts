import type { FastifyPluginAsync } from "fastify";

import type { TemplateDeps } from "./application/deps.js";
import { createExampleUseCase, type CreateExample } from "./application/useCases/createExample.js";
import { exampleRoutes } from "./http/routes.js";

export type { ExampleRepository } from "./application/ports/exampleRepository.js";
export { createInMemoryExampleRepository } from "./infra/inMemoryExampleRepository.js";

export type TemplateModule = {
  routes: FastifyPluginAsync;
  /** Use cases other modules may call go here, already built. */
  createExample: CreateExample;
};

/**
 * Public entry point: the only file other modules may import. `app.ts` does not mount it.
 * Copy this folder, rename it and adapt what is exported.
 */
export const createTemplateModule = (deps: TemplateDeps): TemplateModule => {
  const createExample = createExampleUseCase(deps);
  return { routes: exampleRoutes({ createExample }), createExample };
};
