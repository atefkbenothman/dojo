import { api } from "./_generated/api.js"
import { Doc } from "./_generated/dataModel.js"
import { FunctionReturnType } from "convex/server"

export type AIModel = Doc<"models">
export type Provider = Doc<"providers">
export type MCPServer = Doc<"mcp">
export type Agent = Doc<"agents">
export type Workflow = Doc<"workflows">

export type AIModelWithProvider = FunctionReturnType<typeof api.models.modelsWithProviders>
