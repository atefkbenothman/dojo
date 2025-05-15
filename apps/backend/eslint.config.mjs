import baseConfig from "../../eslint.base.config.mjs"

export default [
  ...baseConfig,
  {
    files: ["**/*.{ts,js}"],
    rules: {},
  },
]
