/**
 * ESLint flat config.
 *
 * Layout of this file (top to bottom):
 *   1. Discovery      – which modules exist under src/modules
 *   2. Import rules   – reusable "forbidden import" patterns (ADR 0001)
 *   3. Rule builders  – turn patterns into per-module / per-layer configs
 *   4. Base config    – ignores, recommended presets, TypeScript style rules
 *   5. Export         – everything assembled in order
 *
 * Order matters in flat configs: later entries override earlier ones.
 */
import js from "@eslint/js";
import { readdirSync } from "node:fs";
import tseslint from "typescript-eslint";

// ---------------------------------------------------------------------------
// 1. Discovery
// ---------------------------------------------------------------------------

const modulesDir = `${import.meta.dirname}/src/modules`;

/** Every folder in src/modules is a module (including `_template`). */
const modules = readdirSync(modulesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

/** Files that get the TypeScript-aware rules. */
const tsFiles = ["src/**/*.ts", "tests/**/*.ts"];

// ---------------------------------------------------------------------------
// 2. Import rules (ADR 0001)
//    Each constant is one `no-restricted-imports` pattern.
// ---------------------------------------------------------------------------

/**
 * Cross-module boundary: from outside module `name`, only its public entry
 * point (`index.js`) may be imported, never its internals.
 */
const internalsOf = (name) => ({
  group: [`**/${name}/**`, `!**/${name}/index.js`],
  message: `Import ${name} only through its public entry point (index.ts). See ADR 0001.`,
});

/**
 * Modules never import each other, not even through `index.ts`. A module that
 * needs another declares its own port in `application/ports`, and `app.ts`
 * (the composition root) adapts the other module's public API to it.
 */
const anotherModule = (name) => ({
  group: [`**/${name}/**`],
  message: `Do not import module ${name}. Declare a port and wire it in app.ts. See ADR 0001.`,
});

/** `application` and `domain` must not depend on the Fastify/Prisma adapters. */
const adapterLayers = {
  group: ["**/http", "**/http/**", "**/infra", "**/infra/**"],
  message: "application and domain code must not import from http or infra. See ADR 0001.",
};

/** `application` and `domain` must not depend on platform (config, db, ...). */
const platformLayer = {
  group: ["**/platform", "**/platform/**"],
  message: "application and domain code must not import from platform. See ADR 0001.",
};

/** Modules receive configuration through their deps; only `main.ts` reads the env. */
const configLayer = {
  group: ["**/platform/config", "**/platform/config/**"],
  message: "modules must not import platform/config; receive values through deps. See ADR 0002.",
};

/** `http` talks to use cases, never to persistence directly. */
const infraFromHttp = {
  group: ["**/infra", "**/infra/**"],
  message: "http code must not import from infra; go through the use cases. See ADR 0001.",
};

/** Shared infrastructure sits below the modules: it cannot depend on any of them. */
const modulesFromInfrastructure = {
  group: ["**/modules", "**/modules/**"],
  message: "platform and shared must not import modules; the composition root wires them.",
};

/** `domain` is the innermost layer: it cannot see `application`. */
const innerLayer = {
  group: ["**/application", "**/application/**"],
  message: "domain code must not import from application. See ADR 0001.",
};

/**
 * Framework and driver packages belong in `http` / `infra`.
 * Wildcards also cover subpaths and sibling packages (e.g. `fastify-plugin`).
 */
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
    "fastify, prisma, pg and zod packages belong in http or infra, not in application/domain. See ADR 0001.",
};

// ---------------------------------------------------------------------------
// 3. Rule builders
// ---------------------------------------------------------------------------

/**
 * Wraps patterns in a `no-restricted-imports` rule.
 *
 * NOTE: when several configs match the same file, ESLint does NOT merge the
 * options of a rule; the last one wins. That is why each layer below lists
 * the cross-module patterns again instead of relying on a broader config.
 */
const restrict = (patterns) => ({
  "no-restricted-imports": ["error", { patterns }],
});

/** Patterns for "every other module's internals", seen from `name`. */
const otherModulesInternals = (name) =>
  modules.filter((other) => other !== name).map(anotherModule);

/**
 * Per-module boundary configs, from least to most strict:
 *   - whole module  → cannot reach into other modules' internals
 *   - application/  → + no adapters, no platform, no vendor packages
 *   - domain/       → + cannot see application/
 */
const moduleBoundaries = modules.flatMap((name) => {
  const others = otherModulesInternals(name);
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

/**
 * Code outside the modules (composition root, entry point, tests) may only
 * see each module's public entry point.
 */
const outsideModulesBoundary = {
  files: ["src/app.ts", "src/main.ts", "tests/**/*.ts"],
  rules: restrict(modules.map(internalsOf)),
};

/** platform/ and shared/ must not know about modules at all. */
const infrastructureBoundary = {
  files: ["src/platform/**/*.ts", "src/shared/**/*.ts"],
  rules: restrict([modulesFromInfrastructure]),
};

// ---------------------------------------------------------------------------
// 4. Base config
// ---------------------------------------------------------------------------

/** Files and folders ESLint never looks at. */
const ignores = {
  ignores: ["dist/**", "node_modules/**", "coverage/**", "**/*.d.ts"],
};

/**
 * typescript-eslint presets:
 *   - `recommended` applies everywhere.
 *   - `recommendedTypeChecked` needs type information, so it is limited to
 *     the files covered by tsconfig.eslint.json.
 */
const typescriptPresets = [
  ...tseslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: tsFiles,
  })),
];

/** Parser setup and project-specific style rules for TypeScript files. */
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
    "@typescript-eslint/consistent-type-definitions": ["error", "type"], // `type`, not `interface`
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }], // `_arg` is allowed
    "@typescript-eslint/require-await": "off", // async handlers/use cases without await are fine
  },
};

// ---------------------------------------------------------------------------
// 5. Export (order matters: general → specific)
// ---------------------------------------------------------------------------

export default [
  ignores,
  js.configs.recommended,
  ...typescriptPresets,
  typescriptProject,
  outsideModulesBoundary,
  infrastructureBoundary,
  ...moduleBoundaries,
];
