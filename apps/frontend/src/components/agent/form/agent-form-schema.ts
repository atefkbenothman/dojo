import { z } from "zod"

// Form schema for agent editing
export const agentFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  systemPrompt: z.string().min(1, "System prompt is required"),
  contextPrompt: z.string().optional(),
  outputType: z.enum(["text", "object"]),
  mcpServers: z.array(z.string()).optional(),
  aiModelId: z.string().min(1, "Model is required"),
})

export type AgentFormValues = z.infer<typeof agentFormSchema>
