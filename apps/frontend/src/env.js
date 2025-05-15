import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  server: {
    MCP_SERVICE_URL: z.string(),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string(),
    NEXT_PUBLIC_SUPABASE_ACCESS_TOKEN: z.string(),
    NEXT_PUBLIC_TICKETMASTER_API_KEY: z.string(),
  },
  runtimeEnv: {
    MCP_SERVICE_URL: process.env.MCP_SERVICE_URL,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_ACCESS_TOKEN: process.env.NEXT_PUBLIC_SUPABASE_ACCESS_TOKEN,
    NEXT_PUBLIC_TICKETMASTER_API_KEY: process.env.NEXT_PUBLIC_TICKETMASTER_API_KEY,
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
