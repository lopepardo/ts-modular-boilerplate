import type { Example } from "../application/exampleRepository.js";
import type { ExampleResponse } from "./schemas.js";

/** Maps the domain entity to the public DTO. */
export const presentExample = (example: Example): ExampleResponse => ({
  id: example.id,
  name: example.name,
});
