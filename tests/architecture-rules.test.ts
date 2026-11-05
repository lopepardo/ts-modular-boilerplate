import { ESLint } from "eslint";
import tseslint from "typescript-eslint";
import { describe, expect, it } from "vitest";

// Only the boundary rules matter here, so skip type-aware linting.
const eslint = new ESLint({
  overrideConfigFile: "eslint.config.js",
  overrideConfig: [
    {
      ...tseslint.configs.disableTypeChecked,
      files: ["src/**/*.ts"],
      languageOptions: { parserOptions: { project: false } },
    },
  ],
});

const violations = async (filePath: string, code: string) => {
  const [result] = await eslint.lintText(code, { filePath });
  return (result?.messages ?? []).filter((m) => m.ruleId === "no-restricted-imports");
};

const app = "src/modules/catalog/application/x.ts";
const domain = "src/modules/catalog/domain/x.ts";
const http = "src/modules/catalog/http/x.ts";

describe("module boundary rules", () => {
  it.each([
    [app, 'import { env } from "../../../platform/config/env.js";'],
    [app, 'import { prisma } from "../../../platform/db/client.js";'],
    [app, 'import Fastify from "fastify";'],
    [app, 'import { z } from "zod";'],
    [app, 'import { x } from "../infra/repo.js";'],
    [domain, 'import { env } from "../../../platform/config/env.js";'],
    [domain, 'import { x } from "../application/getBook.js";'],
    [domain, 'import { PrismaClient } from "@prisma/client";'],
    [domain, 'import { x } from "../http/routes.js";'],
  ])("rejects %s -> %s", async (file, code) => {
    expect(await violations(file, code)).not.toHaveLength(0);
  });

  it.each([
    [app, 'import { x } from "../domain/book.js";'],
    [app, 'import { x } from "../../../shared/errors.js";'],
    [domain, 'import { x } from "../../../shared/ids.js";'],
    [http, 'import { x } from "../application/getBook.js";'],
    [http, 'import Fastify from "fastify";'],
    [http, 'import { env } from "../../../platform/config/env.js";'],
  ])("allows %s -> %s", async (file, code) => {
    expect(await violations(file, code)).toHaveLength(0);
  });
});
