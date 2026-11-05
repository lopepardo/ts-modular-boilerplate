import type { PrismaClient } from "../../src/platform/db/client.js";

/**
 * Stand-in for tests that use in-memory repositories. Any access means a test
 * reached the database without overriding the repository, so fail loudly.
 */
export const fakePrisma = new Proxy({} as PrismaClient, {
  get: (_target, property) => {
    throw new Error(
      `fakePrisma.${String(property)} accessed: override the repository in this test`,
    );
  },
});
