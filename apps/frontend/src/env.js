import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    BACKEND_URL: z.string().url(),
  },
  client: {
    NEXT_PUBLIC_BACKEND_URL: z.string().url(),
    NEXT_PUBLIC_CONVEX_URL: z.string().url(),
    NEXT_PUBLIC_ENCRYPTION_SECRET: z.string().min(32),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    BACKEND_URL: process.env.BACKEND_URL,
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
    NEXT_PUBLIC_ENCRYPTION_SECRET: process.env.NEXT_PUBLIC_ENCRYPTION_SECRET,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
})
