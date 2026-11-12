import { existsSync, readdirSync, readFileSync } from "node:fs";
import { ESLint } from "eslint";
import tseslint from "typescript-eslint";
import { describe, expect, it } from "vitest";

// Only the boundary rules matter here, so skip type-aware linting.
const eslint = new ESLint({
  overrideConfigFile: "eslint.config.js",
  overrideConfig: [
    {
      ...tseslint.configs.disableTypeChecked,
      files: ["src/**/*.ts", "tests/**/*.ts"],
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

    it("lets tests import a module's index and domain, but not its other internals", async () => {
      const test = `tests/x.test.ts`;
      const index = `import { x } from "../src/modules/${other}/index.js";`;
      const domainCode = `import { x } from "../src/modules/${other}/domain/x.js";`;
      expect(await violations(test, index)).toHaveLength(0);
      expect(await violations(test, domainCode)).toHaveLength(0);
      for (const layer of ["application", "http", "infra"]) {
        const code = `import { x } from "../src/modules/${other}/${layer}/x.js";`;
        expect(await violations(test, code)).not.toHaveLength(0);
      }
    });

    it("still lets the composition root import a module's index only", async () => {
      const index = `import { x } from "./modules/${other}/index.js";`;
      const internals = `import { x } from "./modules/${other}/infra/x.js";`;
      expect(await violations("src/app.ts", index)).toHaveLength(0);
      const domainCode = `import { x } from "./modules/${other}/domain/x.js";`;
      expect(await violations("src/app.ts", internals)).not.toHaveLength(0);
      expect(await violations("src/app.ts", domainCode)).not.toHaveLength(0);
    });
  });
});

// Table ownership: only the infra/ of the module whose prisma/schema/<module>.prisma declares a
// model may use its delegate. Like the rules, the tests read the models from the schema files.
const tableViolations = async (filePath: string, code: string) => {
  const [result] = await eslint.lintText(code, { filePath });
  return (result?.messages ?? []).filter((m) => m.ruleId === "no-restricted-syntax");
};

const modelsOf = (name: string) => {
  const file = `prisma/schema/${name}.prisma`;
  const schema = existsSync(file) ? readFileSync(file, "utf8") : "";
  return Array.from(schema.matchAll(/^model\s+(\w+)/gm), ([, model = ""]) => model);
};
const delegateOf = (model: string) => model.charAt(0).toLowerCase() + model.slice(1);

const owner = modules.find((name) => modelsOf(name).length > 0);
const table = delegateOf((owner && modelsOf(owner)[0]) ?? "none");
const stranger = modules.find((name) => name !== owner);

describe.skipIf(owner === undefined)("table ownership rules", () => {
  const read = `const rows = await prisma.${table}.findMany();`;
  const ownerAt = (layer: string) => `src/modules/${owner}/${layer}/x.ts`;

  it.each([
    ["src/app.ts", read],
    ["src/platform/http/x.ts", read],
    [ownerAt("application"), read],
    [ownerAt("domain"), read],
    [ownerAt("http"), read],
  ])("rejects %s -> %s", async (file, code) => {
    expect(await tableViolations(file, code)).not.toHaveLength(0);
  });

  it.each([
    [ownerAt("infra"), read],
    [ownerAt("infra"), `const rows = await tx.${table}.findMany();`],
    ["src/app.ts", `const rows = deps.${table};`],
  ])("allows %s -> %s", async (file, code) => {
    expect(await tableViolations(file, code)).toHaveLength(0);
  });

  it.each(modules.flatMap((name) => modelsOf(name).map((model) => [name, delegateOf(model)])))(
    "lets %s/infra use its own %s",
    async (name, delegate) => {
      const code = `const rows = await prisma.${delegate}.findMany();`;
      expect(await tableViolations(`src/modules/${name}/infra/x.ts`, code)).toHaveLength(0);
    },
  );

  describe.skipIf(stranger === undefined)("from another module", () => {
    it.each([
      read,
      `const rows = await tx.${table}.findMany();`,
      `await this.prisma.${table}.deleteMany();`,
    ])("rejects its infra -> %s", async (code) => {
      expect(await tableViolations(`src/modules/${stranger}/infra/x.ts`, code)).not.toHaveLength(0);
    });
  });
});
