import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      "node_modules/**",
      "**/dist/**",
      "**/node_modules/**",
      "**/.next/**",
      // apps/web has its own eslint config (Next.js flat config) and lints itself.
      "apps/web/**",
      // assets/ is legacy WordPress/PHP plugin code being migrated out — not ours.
      "assets/**",
    ],
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // Flag unused vars/imports; allow intentional `_`-prefixed throwaways
      // (e.g. the `{ items: _omit, ...rest }` destructure in the handlers).
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
    },
  },
  {
    // Build/runner scripts are plain Node ESM.
    files: ["**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node },
    },
  },
];
