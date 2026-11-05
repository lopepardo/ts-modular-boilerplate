import type { ServerConfig } from "../../src/platform/http/createServer.js";

/** Explicit config for tests: silent logger, no dependency on process env. */
export const testConfig: ServerConfig = {
  APP_NAME: "test",
  APP_ENV: "test",
  LOG_LEVEL: "silent",
};
