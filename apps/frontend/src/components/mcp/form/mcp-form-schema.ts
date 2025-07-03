import { ALLOWED_STDIO_COMMANDS } from "@dojo/db/convex/types"
import { z } from "zod"

// Helper function for validating key-value pairs (headers and env vars)
export function validateKeyValuePairs(fieldType: string) {
  return (pairs: Array<{ key: string; value: string }>, ctx: z.RefinementCtx) => {
    // Check for duplicate keys
    const keys = pairs.map((p) => p.key).filter(Boolean)
    const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index)
    if (duplicates.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate ${fieldType} keys: ${[...new Set(duplicates)].join(", ")}`,
      })
    }

    // Warn about empty values (non-blocking)
    const emptyPairs = pairs.filter((p) => p.key && !p.value)
    if (emptyPairs.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${fieldType.charAt(0).toUpperCase() + fieldType.slice(1)}s with empty values will be ignored: ${emptyPairs.map((p) => p.key).join(", ")}`,
      })
    }
  }
}

// Base schema for common fields
const baseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  summary: z.string().optional(),
})

// Form schema for MCP server editing - using intersection to preserve all fields
export const mcpFormSchema = z.intersection(
  baseSchema,
  z.discriminatedUnion("transportType", [
    z.object({
      transportType: z.literal("stdio"),
      command: z.enum(ALLOWED_STDIO_COMMANDS, {
        errorMap: () => ({ message: "Only npx and uvx commands are allowed" }),
      }),
      argsString: z.string(),
      envPairs: z
        .array(
          z.object({
            key: z.string(),
            value: z.string(),
          }),
        )
        .superRefine(validateKeyValuePairs("environment variable")),
      // Make other transport fields optional when in stdio mode
      url: z.string().optional(),
      headers: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
    }),
    z.object({
      transportType: z.literal("http"),
      url: z.string().url("Please enter a valid URL"),
      headers: z
        .array(
          z.object({
            key: z.string(),
            value: z.string(),
          }),
        )
        .superRefine(validateKeyValuePairs("header")),
      // Make stdio fields optional when in http mode
      command: z.string().optional(),
      argsString: z.string().optional(),
      envPairs: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
    }),
    z.object({
      transportType: z.literal("sse"),
      url: z.string().url("Please enter a valid URL"),
      headers: z
        .array(
          z.object({
            key: z.string(),
            value: z.string(),
          }),
        )
        .superRefine(validateKeyValuePairs("header")),
      // Make stdio fields optional when in sse mode
      command: z.string().optional(),
      argsString: z.string().optional(),
      envPairs: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
    }),
  ]),
)

export type MCPFormValues = z.infer<typeof mcpFormSchema>
