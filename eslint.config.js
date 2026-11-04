import js from "@eslint/js";
import { readdirSync } from "node:fs";
import tseslint from "typescript-eslint";

const modulesDir = `${import.meta.dirname}/src/modules`;
const modules = readdirSync(modulesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

const restrict = (...patterns) => ({
  "no-restricted-imports": ["error", { patterns }],
});

/** Only a module's public entry point (`index.js`) may be imported. */
const internalsOf = (name) => ({
  group: [`**/${name}/**`, `!**/${name}/index.js`],
  message: `Import ${name} only through its public entry point (index.ts). See ADR 0001.`,
});

/** `application` and `domain` stay independent of Fastify/Prisma adapters. */
const adapterLayers = {
  group: ["**/http", "**/http/**", "**/infra", "**/infra/**"],
  message:
    "application and domain code must not import from http or infra. See ADR 0001.",
};

const boundaryConfigs = modules.flatMap((name) => {
  const others = modules.filter((other) => other !== name).map(internalsOf);
  return [
    {
      files: [`src/modules/${name}/**/*.ts`],
      rules: restrict(...others),
    },
    {
      files: [
        `src/modules/${name}/application/**/*.ts`,
        `src/modules/${name}/domain/**/*.ts`,
      ],
      rules: restrict(...others, adapterLayers),
    },
  ];
});

export default [
  {
    ignores: ["dist/**", "node_modules/**", "coverage/**", "**/*.d.ts"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: ["src/**/*.ts", "tests/**/*.ts"],
  })),
  {
    files: ["src/**/*.ts", "tests/**/*.ts"],
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
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/require-await": "off",
    },
  },
  // Module boundaries (ADR 0001): app.ts and tests see only public entry points.
  {
    files: ["src/app.ts", "src/main.ts", "tests/**/*.ts"],
    rules: restrict(...modules.map(internalsOf)),
  },
  ...boundaryConfigs,
];
