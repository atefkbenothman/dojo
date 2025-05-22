import { nextJsConfig } from "@dojo/eslint/next"

/** @type {import("eslint").Linter.Config} */
export default [
  ...nextJsConfig,
  {
    files: ["src/env.js"],
    languageOptions: {
      globals: {
        process: "readonly",
      },
    },
  },
]
