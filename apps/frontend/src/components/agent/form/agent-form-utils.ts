import type { AgentFormValues } from "./agent-form-schema"
import type { Doc, Id } from "@dojo/db/convex/_generated/dataModel"
import type { Agent } from "@dojo/db/convex/types"

// Get default form values for agent
export function getDefaultAgentFormValues(agent?: Agent, defaultModelId?: string): AgentFormValues {
  return {
    name: agent?.name || "",
    systemPrompt: agent?.systemPrompt || "",
    outputType: (agent?.outputType as "text" | "object") || "text",
    mcpServers: agent?.mcpServers || [],
    aiModelId: agent?.aiModelId || defaultModelId || "",
  }
}

// Filter MCP servers based on agent visibility
export function filterMcpServersByVisibility(
  mcpServers: Doc<"mcp">[],
  mode: "add" | "edit",
  isPublicAgent?: boolean,
): Doc<"mcp">[] {
  if (mode === "add" || !isPublicAgent) {
    // Creating new agent or editing private agent - show only private MCP servers
    return mcpServers.filter((server) => !server.isPublic)
  }
  // For public agents, show only public MCP servers
  return mcpServers.filter((server) => server.isPublic)
}

// Convert model ID to Convex ID
export function getConvexModelId(models: Doc<"models">[], modelId?: string): string | undefined {
  if (!modelId) return undefined
  const model = models.find((m) => m.modelId === modelId)
  return model?._id
}

// Convert Convex ID to model ID
export function getModelIdFromConvex(models: Doc<"models">[], convexId?: string): string | undefined {
  if (!convexId) return undefined
  const model = models.find((m) => m._id === convexId)
  return model?.modelId
}

// Prepare form data for saving
export function prepareAgentData(data: AgentFormValues, isPublic: boolean = false) {
  return {
    name: data.name,
    systemPrompt: data.systemPrompt,
    outputType: data.outputType,
    mcpServers: (data.mcpServers || []) as Id<"mcp">[],
    aiModelId: data.aiModelId as Id<"models">,
    isPublic,
  }
}
