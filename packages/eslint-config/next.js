import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import nextPlugin from "@next/eslint-plugin-next";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import prettierConfig from "eslint-config-prettier";

export default [
  {
    ignores: [
      "node_modules",
      "dist",
      ".next",
      "out",
      "build",
      "eslint.config.js",
      "eslint.config.mjs",
    ],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: process.cwd(),
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      "@next/next": nextPlugin,
      react,
      "react-hooks": reactHooks,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...tseslint.configs["recommended-type-checked"].rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
    },
    settings: {
      react: {
        version: "detect",
      },
      next: {
        rootDir: ["."],
      },
    },
    extends: [prettierConfig],
  },
];
