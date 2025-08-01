/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "@dojo/env/frontend"

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: false,
  // eslint: {
  //   ignoreDuringBuilds: true,
  // },
  // typescript: {
  //   ignoreBuildErrors: true,
  // },
  experimental: {
    reactCompiler: true,
  },
}

export default config
