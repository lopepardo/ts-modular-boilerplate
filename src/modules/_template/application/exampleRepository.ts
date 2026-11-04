/** Plain record owned by this module. Rename it to your own concept. */
export type Example = {
  id: string;
  name: string;
};

/** Declared by the application layer, implemented in `infra`. */
export type ExampleRepository = {
  save: (example: Example) => Promise<Example>;
};
