import type { IdGenerator } from "../../../shared/ids.js";
import type { Example, ExampleRepository } from "./exampleRepository.js";

export type CreateExampleDeps = {
  repository: ExampleRepository;
  generateId: IdGenerator;
};

export type CreateExample = (input: { name: string }) => Promise<Example>;

/** Use case: a factory that receives its dependencies (ADR 0002). */
export const createExampleUseCase =
  ({ repository, generateId }: CreateExampleDeps): CreateExample =>
  (input) =>
    repository.save({ id: generateId(), name: input.name });
