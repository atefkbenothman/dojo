import type { ProviderId } from "./config.js"
import { z } from "zod"

export const MCPServerConfigSchema = z.object({
  command: z.string(),
  args: z.array(z.string()),
  env: z.record(z.string()).optional(),
  requiresEnv: z.array(z.string()).optional(),
})

export type MCPServerConfig = z.infer<typeof MCPServerConfigSchema>

export const MCPServerSchema = z.object({
  id: z.string(),
  name: z.string(),
  summary: z.string().optional(),
  requiresUserKey: z.boolean().optional(),
  config: MCPServerConfigSchema.optional(),
  localOnly: z.boolean().optional(),
})

export type MCPServer = z.infer<typeof MCPServerSchema>

export const AIModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  modelName: z.string(),
  type: z.enum(["text", "image"]),
  provider: z.custom<ProviderId>(),
  requiresApiKey: z.boolean().optional(),
})

export type AIModel = z.infer<typeof AIModelSchema>

export const TextOutputSchema = z.object({
  type: z.literal("text"),
  mcpServers: z.array(MCPServerSchema).optional(),
})

export const ObjectOutputSchema = z.object({
  type: z.literal("object"),
  objectJsonSchema: z.any(),
})

export const AgentConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  systemPrompt: z.string(),
  aiModelId: z.string(),
  output: z.discriminatedUnion("type", [TextOutputSchema, ObjectOutputSchema]).default({ type: "text" }),
})

export type AgentConfig = z.infer<typeof AgentConfigSchema>

export const ChatInteractionSchema = z.object({
  modelId: z.string(),
})

export type ChatInteraction = z.infer<typeof ChatInteractionSchema>

export const AgentInteractionSchema = z.object({
  agentConfig: AgentConfigSchema,
})

export type AgentInteraction = z.infer<typeof AgentInteractionSchema>

const ToolCallSchema = z.object({
  id: z.string().optional(),
  type: z.literal("function"),
  function: z.object({
    name: z.string(),
    arguments: z.string(),
  }),
})

export const CoreMessageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(["user", "assistant", "system", "tool", "function"]),
  content: z.string(),
  tool_calls: z.array(ToolCallSchema).optional(),
  tool_call_id: z.string().optional(),
  name: z.string().optional(),
})

export const AgentWorkflowStepSchema = z.object({
  id: z.string(),
  agentConfigId: z.string(),
})

export type AgentWorkflowStep = z.infer<typeof AgentWorkflowStepSchema>

export const AgentWorkflowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  prompt: z.string(),
  steps: z.array(AgentWorkflowStepSchema),
})

export type AgentWorkflow = z.infer<typeof AgentWorkflowSchema>
