import type { Example } from "../../domain/example.js";
import type { TemplateDeps } from "../deps.js";

export type CreateExample = (input: { name: string }) => Promise<Example>;

/** Use case: a factory that receives its dependencies (ADR 0002). */
export const createExampleUseCase =
  ({ repository, generateId }: Pick<TemplateDeps, "repository" | "generateId">): CreateExample =>
  (input) =>
    repository.save({ id: generateId(), name: input.name });
