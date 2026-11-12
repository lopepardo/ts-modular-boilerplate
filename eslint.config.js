// ESLint flat config. Order matters: later entries override earlier ones.
import js from "@eslint/js";
import { readdirSync, readFileSync } from "node:fs";
import tseslint from "typescript-eslint";

// --- 1. Discovery -----------------------------------------------------------

const modulesDir = `${import.meta.dirname}/src/modules`;

/** Every folder in src/modules is a module. */
const modules = readdirSync(modulesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

/** Files that get the TypeScript-aware rules. */
const tsFiles = ["src/**/*.ts", "tests/**/*.ts"];

// --- 2. Import rules: one `no-restricted-imports` pattern each -------------

/** Outside the modules (app.ts, main.ts), only a module's `index.js` may be imported. */
const internalsOf = (name) => ({
  group: [`**/${name}/**`, `!**/${name}/index.js`],
  message: `Import ${name} only through its public entry point (index.ts).`,
});

/** Modules never import each other, not even `index.ts`: declare a port, adapt it in app.ts. */
const anotherModule = (name) => ({
  group: [`**/${name}/**`],
  message: `Do not import module ${name}. Declare a port and wire it in app.ts.`,
});

const adapterLayers = {
  group: ["**/http", "**/http/**", "**/infra", "**/infra/**"],
  message: "application and domain code must not import from http or infra.",
};

const platformLayer = {
  group: ["**/platform", "**/platform/**"],
  message: "application and domain code must not import from platform.",
};

const configLayer = {
  group: ["**/platform/config", "**/platform/config/**"],
  message: "modules must not import platform/config; receive values through deps.",
};

const infraFromHttp = {
  group: ["**/infra", "**/infra/**"],
  message: "http code must not import from infra; go through the use cases.",
};

const modulesFromInfrastructure = {
  group: ["**/modules", "**/modules/**"],
  message: "platform and shared must not import modules; the composition root wires them.",
};

const innerLayer = {
  group: ["**/application", "**/application/**"],
  message: "domain code must not import from application.",
};

/** Wildcards also cover subpaths and sibling packages (e.g. `fastify-plugin`). */
const vendorPackages = {
  group: [
    "fastify",
    "fastify/**",
    "fastify-*",
    "@fastify/*",
    "@prisma/*",
    "pg",
    "pg/**",
    "pg-*",
    "zod",
    "zod/**",
  ],
  message:
    "fastify, prisma, pg and zod packages belong in http or infra, not in application/domain.",
};

// --- 3. Rule builders -------------------------------------------------------

/**
 * ESLint does not merge a rule's options across configs that match the same file (the last one
 * wins), so each layer below repeats every pattern that applies to it.
 */
const restrict = (patterns) => ({
  "no-restricted-imports": ["error", { patterns }],
});

const otherModules = (name) => modules.filter((other) => other !== name).map(anotherModule);

/** Per module, from least to most strict: whole module, http/, application/, domain/. */
const moduleBoundaries = modules.flatMap((name) => {
  const others = otherModules(name);
  return [
    {
      files: [`src/modules/${name}/**/*.ts`],
      rules: restrict([...others, configLayer]),
    },
    {
      files: [`src/modules/${name}/http/**/*.ts`],
      rules: restrict([...others, configLayer, infraFromHttp]),
    },
    {
      files: [`src/modules/${name}/application/**/*.ts`],
      rules: restrict([...others, adapterLayers, platformLayer, vendorPackages]),
    },
    {
      files: [`src/modules/${name}/domain/**/*.ts`],
      rules: restrict([...others, adapterLayers, platformLayer, innerLayer, vendorPackages]),
    },
  ];
});

const outsideModulesBoundary = {
  files: ["src/app.ts", "src/main.ts"],
  rules: restrict(modules.map(internalsOf)),
};

/** Tests may also import a module's `domain/`: pure code, unit-tested without the database. */
const testsBoundary = {
  files: ["tests/**/*.ts"],
  rules: restrict(
    modules.map((name) => ({
      // `domain` itself too: gitignore patterns cannot re-include files of an excluded dir.
      group: [
        `**/${name}/**`,
        `!**/${name}/index.js`,
        `!**/${name}/domain`,
        `!**/${name}/domain/**`,
      ],
      message: `Tests import ${name} only through its public entry point (index.ts) or its domain/.`,
    })),
  ),
};

const infrastructureBoundary = {
  files: ["src/platform/**/*.ts", "src/shared/**/*.ts"],
  rules: restrict([modulesFromInfrastructure]),
};

// --- 4. Table ownership -----------------------------------------------------
// Only the infra/ of the module whose prisma/schema/<module>.prisma declares a model may use its
// delegate (`prisma.book`, `tx.book`, `this.prisma.book`). Tests are exempt to delete their rows.

const schemaDir = `${import.meta.dirname}/prisma/schema`;

/** Models owned by each module, read from its schema file (`base.prisma` has none). */
const modelsByModule = Object.fromEntries(
  modules.map((name) => {
    let schema = "";
    try {
      schema = readFileSync(`${schemaDir}/${name}.prisma`, "utf8");
    } catch {
      // A module without tables has no schema file.
    }
    return [name, [...schema.matchAll(/^model\s+(\w+)/gm)].map((match) => match[1])];
  }),
);

/** `Book` -> `book`: the property name on the Prisma client. */
const delegateName = (model) => model.charAt(0).toLowerCase() + model.slice(1);

const clientNames = "/^(prisma|tx|db|client)$/";

/** Selector for `<client>.<delegate>` and `this.<client>.<delegate>`. */
const touchesTable = (model) => ({
  selector: `MemberExpression[property.name='${delegateName(model)}']:matches([object.name=${clientNames}], [object.property.name=${clientNames}])`,
  message: `Table ${model} belongs to another module; use that module's public API.`,
});

/** An empty list must switch the rule off: severity alone would inherit the previous options. */
const restrictTables = (models) => ({
  "no-restricted-syntax": models.length === 0 ? "off" : ["error", ...models.map(touchesTable)],
});

const allModels = Object.values(modelsByModule).flat();

const tableOwnership = [
  // Default: nobody touches any table...
  { files: ["src/**/*.ts"], rules: restrictTables(allModels) },
  // ...except a module's infra, which may use its own tables.
  ...modules.map((name) => ({
    files: [`src/modules/${name}/infra/**/*.ts`],
    rules: restrictTables(
      Object.entries(modelsByModule)
        .filter(([owner]) => owner !== name)
        .flatMap(([, models]) => models),
    ),
  })),
];

// --- 5. Base config ---------------------------------------------------------

const ignores = {
  ignores: ["dist/**", "node_modules/**", "coverage/**", "**/*.d.ts"],
};

/** `recommendedTypeChecked` needs type information: only the files in tsconfig.eslint.json. */
const typescriptPresets = [
  ...tseslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: tsFiles,
  })),
];

const typescriptProject = {
  files: tsFiles,
  languageOptions: {
    globals: {
      console: "readonly",
      process: "readonly",
    },
    parserOptions: {
      project: "./tsconfig.eslint.json",
      tsconfigRootDir: import.meta.dirname,
    },
  },
  rules: {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/consistent-type-definitions": ["error", "type"],
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/require-await": "off", // async handlers/use cases without await are fine
  },
};

// --- 6. Export: general → specific -----------------------------------------

export default [
  ignores,
  js.configs.recommended,
  ...typescriptPresets,
  typescriptProject,
  outsideModulesBoundary,
  testsBoundary,
  infrastructureBoundary,
  ...moduleBoundaries,
  ...tableOwnership,
];
