import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    BACKEND_URL: z.string().url(),
  },
  client: {
    NEXT_PUBLIC_OPENAI_API_KEY: z.string().optional(),
    NEXT_PUBLIC_GOOGLE_API_KEY: z.string().optional(),
    NEXT_PUBLIC_GROQ_API_KEY: z.string().optional(),
    NEXT_PUBLIC_SUPABASE_ACCESS_TOKEN: z.string().optional(),
    NEXT_PUBLIC_TICKETMASTER_API_KEY: z.string().optional(),
    NEXT_PUBLIC_NOTION_API_KEY: z.string().optional(),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    BACKEND_URL: process.env.BACKEND_URL,
    NEXT_PUBLIC_OPENAI_API_KEY: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    NEXT_PUBLIC_GOOGLE_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
    NEXT_PUBLIC_GROQ_API_KEY: process.env.NEXT_PUBLIC_GROQ_API_KEY,
    NEXT_PUBLIC_SUPABASE_ACCESS_TOKEN: process.env.NEXT_PUBLIC_SUPABASE_ACCESS_TOKEN,
    NEXT_PUBLIC_TICKETMASTER_API_KEY: process.env.NEXT_PUBLIC_TICKETMASTER_API_KEY,
    NEXT_PUBLIC_NOTION_API_KEY: process.env.NEXT_PUBLIC_NOTION_API_KEY,
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
