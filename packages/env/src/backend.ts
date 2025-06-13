import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]).default("development").describe("Application environment"),
    PORT: z.string().default("8888").describe("Backend server port"),
    CONVEX_URL: z.string().url().describe("Convex database URL"),
    ENCRYPTION_SECRET: z.string().min(32).describe("Server-side encryption secret for API keys"),
    GROQ_API_KEY_FALLBACK: z.string().optional().describe("Fallback API key for free Groq models"),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    CONVEX_URL: process.env.CONVEX_URL,
    ENCRYPTION_SECRET: process.env.ENCRYPTION_SECRET,
    GROQ_API_KEY_FALLBACK: process.env.GROQ_API_KEY_FALLBACK,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
  onValidationError: (error) => {
    console.error("❌ Invalid environment variables in backend:")
    console.error(error)
    throw new Error("Invalid environment variables")
  },
  onInvalidAccess: (variable) => {
    throw new Error(`❌ Attempted to access a server-side environment variable "${variable}" on the client.`)
  },
})
