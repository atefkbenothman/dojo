import { CoreMessageSchema, MCPServerSchema } from "@dojo/config"
import { z } from "zod"

export const connectInputSchema = z.object({
  servers: z.array(MCPServerSchema).min(1),
})

export const disconnectInputSchema = z.object({
  serverId: z.string().min(1),
})

export const chatInputSchema = z.object({
  messages: z.array(CoreMessageSchema).min(1, { message: "Missing or invalid messages array" }),
  modelId: z.string().min(1, { message: "Missing modelId" }),
  apiKey: z.string().optional(),
})
