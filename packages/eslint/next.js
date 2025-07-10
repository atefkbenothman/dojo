import { config as baseConfig } from "./base.js"
import js from "@eslint/js"
import pluginNext from "@next/eslint-plugin-next"
import pluginReactCompiler from "babel-plugin-react-compiler"
import pluginReactHooksExtra from "eslint-plugin-react-hooks-extra"
import eslintConfigPrettier from "eslint-config-prettier"
import pluginReact from "eslint-plugin-react"
import pluginReactHooks from "eslint-plugin-react-hooks"
import globals from "globals"
import tseslint from "typescript-eslint"

/**
 * A custom ESLint configuration for libraries that use Next.js.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const nextJsConfig = [
  ...baseConfig,
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,
  {
    ...pluginReact.configs.flat.recommended,
    languageOptions: {
      ...pluginReact.configs.flat.recommended.languageOptions,
      globals: {
        ...globals.serviceworker,
      },
    },
  },
  {
    plugins: {
      "@next/next": pluginNext,
      "react-hooks": pluginReactHooks,
      "react-compiler": pluginReactCompiler,
      "react-hooks-extra": pluginReactHooksExtra,
    },
    settings: { react: { version: "detect" } },
    rules: {
      ...pluginNext.configs.recommended.rules,
      ...pluginNext.configs["core-web-vitals"].rules,
      ...pluginReactHooks.configs.recommended.rules,
      "react/prop-types": "off",
      "@next/next/no-img-element": "off",
      "react/react-in-jsx-scope": "off",
      "turbo/no-undeclared-env-vars": "warn",
      "react-hooks-extra/no-direct-set-state-in-use-effect": "warn",
    },
  },
]
