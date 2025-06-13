import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]).default("development").describe("Application environment"),
    BACKEND_URL: z.string().url().describe("Backend API URL for server-side requests"),
    ENCRYPTION_SECRET: z.string().min(32).describe("Server-side encryption secret for API keys"),
  },
  client: {
    NEXT_PUBLIC_BACKEND_URL: z.string().url().describe("Backend API URL for client-side requests"),
    NEXT_PUBLIC_CONVEX_URL: z.string().url().describe("Convex database URL for client-side"),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    BACKEND_URL: process.env.BACKEND_URL,
    ENCRYPTION_SECRET: process.env.ENCRYPTION_SECRET,
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
  onValidationError: (error) => {
    console.error("❌ Invalid environment variables in frontend:")
    console.error(error)
    throw new Error("Invalid environment variables")
  },
  onInvalidAccess: (variable) => {
    throw new Error(`❌ Attempted to access a server-side environment variable "${variable}" on the client.`)
  },
})
