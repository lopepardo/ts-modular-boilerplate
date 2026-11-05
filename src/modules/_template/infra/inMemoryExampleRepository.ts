import type { Example, ExampleRepository } from "../application/exampleRepository.js";

/**
 * The template owns no table yet, so it ships an in-memory implementation.
 * When you copy the module, replace it with a Prisma repository that takes the
 * `PrismaClient` and only touches this module's tables (ADR 0003).
 */
export const createInMemoryExampleRepository = (): ExampleRepository => {
  const store = new Map<string, Example>();

  return {
    save: async (example) => {
      store.set(example.id, example);
      return example;
    },
  };
};
