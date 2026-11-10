import { readdirSync } from "node:fs";
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

// The rules are module-agnostic, so the tests are too: they use whichever
// modules exist on disk (the first is the subject, the second "the other one").
const modules = readdirSync("src/modules", { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);
const [subject = "none", other] = modules;

const at = (layer: string) => `src/modules/${subject}/${layer}/x.ts`;
const app = at("application");
const domain = at("domain");
const http = at("http");
const infra = at("infra");
const platform = "src/platform/http/x.ts";
const shared = "src/shared/x.ts";

describe.skipIf(modules.length === 0)("module boundary rules", () => {
  it.each([
    [app, 'import { prisma } from "../../../platform/db/client.js";'],
    [app, 'import Fastify from "fastify";'],
    [app, 'import { z } from "zod";'],
    [app, 'import { x } from "../infra/repo.js";'],
    [domain, 'import { x } from "../application/useCases/x.js";'],
    [http, 'import { x } from "../infra/repo.js";'],
    [http, 'import { env } from "../../../platform/config/env.js";'],
    [infra, 'import { env } from "../../../platform/config/env.js";'],
    [platform, `import { x } from "../../modules/${subject}/index.js";`],
    [platform, `import { x } from "../../modules/${subject}/infra/repo.js";`],
    [shared, `import { x } from "../modules/${subject}/domain/x.js";`],
  ])("rejects %s -> %s", async (file, code) => {
    expect(await violations(file, code)).not.toHaveLength(0);
  });

  it.each([
    [app, 'import { x } from "../domain/x.js";'],
    [http, 'import { x } from "../application/useCases/x.js";'],
    [infra, 'import { x } from "../../../platform/db/client.js";'],
    [platform, 'import { x } from "../../shared/errors.js";'],
  ])("allows %s -> %s", async (file, code) => {
    expect(await violations(file, code)).toHaveLength(0);
  });

  describe.skipIf(other === undefined)("between modules", () => {
    it.each(["application", "domain", "http", "infra"])(
      "rejects %s importing another module, even its index",
      async (layer) => {
        const code = `import { x } from "../../${other}/index.js";`;
        expect(await violations(at(layer), code)).not.toHaveLength(0);
      },
    );

    it("rejects importing another module's internals", async () => {
      const code = `import { x } from "../../${other}/domain/x.js";`;
      expect(await violations(http, code)).not.toHaveLength(0);
    });

    it("still lets the composition root import a module's index only", async () => {
      const index = `import { x } from "./modules/${other}/index.js";`;
      const internals = `import { x } from "./modules/${other}/infra/x.js";`;
      expect(await violations("src/app.ts", index)).toHaveLength(0);
      expect(await violations("src/app.ts", internals)).not.toHaveLength(0);
    });
  });
});

// Table ownership: each module is the only reader/writer of its tables. The owner of
// a model is the module whose prisma/schema/<module>.prisma declares it.
const tableViolations = async (filePath: string, code: string) => {
  const [result] = await eslint.lintText(code, { filePath });
  return (result?.messages ?? []).filter((m) => m.ruleId === "no-restricted-syntax");
};

describe.skipIf(!modules.includes("catalog") || !modules.includes("lending"))(
  "table ownership rules",
  () => {
    const read = "const books = await prisma.book.findMany();";

    it.each([
      ["src/app.ts", read],
      ["src/platform/http/x.ts", read],
      ["src/modules/catalog/application/x.ts", read],
      ["src/modules/catalog/http/x.ts", read],
      ["src/modules/lending/infra/x.ts", read],
      ["src/modules/lending/infra/x.ts", "const books = await tx.book.findMany();"],
      ["src/modules/lending/infra/x.ts", "await this.prisma.book.deleteMany();"],
    ])("rejects %s -> %s", async (file, code) => {
      expect(await tableViolations(file, code)).not.toHaveLength(0);
    });

    it.each([
      ["src/modules/catalog/infra/x.ts", read],
      ["src/modules/catalog/infra/x.ts", "const books = await tx.book.findMany();"],
      ["src/modules/lending/infra/x.ts", "const loans = await prisma.loan.findMany();"],
      ["src/app.ts", "const book = deps.book;"],
    ])("allows %s -> %s", async (file, code) => {
      expect(await tableViolations(file, code)).toHaveLength(0);
    });
  },
);
