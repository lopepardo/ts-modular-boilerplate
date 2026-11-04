import type { FastifyPluginAsync } from "fastify";

import {
  createExampleUseCase,
  type CreateExample,
  type CreateExampleDeps,
} from "./application/createExample.js";
import { exampleRoutes } from "./http/routes.js";

export type {
  Example,
  ExampleRepository,
} from "./application/exampleRepository.js";
export { createInMemoryExampleRepository } from "./infra/inMemoryExampleRepository.js";

export type TemplateModule = {
  routes: FastifyPluginAsync;
  /** Use cases other modules may call go here, already built. */
  createExample: CreateExample;
};

/**
 * Public entry point: the only file other modules (and `app.ts`) may import.
 * Copy this folder, rename it and adapt what is exported.
 */
export const createTemplateModule = (
  deps: CreateExampleDeps,
): TemplateModule => {
  const createExample = createExampleUseCase(deps);
  return { routes: exampleRoutes({ createExample }), createExample };
};
