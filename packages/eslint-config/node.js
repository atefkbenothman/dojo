import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettier from "eslint-config-prettier";

export default [
  {
    ignores: ["node_modules", "dist", "eslint.config.js"],
  },
  {
    files: ["**/*.{js,ts}"] ,
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: process.cwd(),
        ecmaVersion: 2022,
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    settings: {
      "import/resolver": {
        typescript: {
          project: "./tsconfig.json",
        },
        node: true,
      },
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...tseslint.configs["recommended-type-checked"].rules,
    },
  },
  prettier,
];
