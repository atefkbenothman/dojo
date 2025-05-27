// import { handleAiChainRequest } from "../agents/orchestrator.js"
// import { getModelInstance } from "../ai/get-model.js"
// import { establishMcpConnection, cleanupExistingConnection } from "../mcp-connection.js"
// import type { AgentConfig, RequestWithUserContext } from "../types.js"
// import { type UserSession } from "@dojo/backend/src/types.js"
// import { type CoreMessage, type ToolSet, type LanguageModel } from "ai"
// import { Router, Request, Response } from "express"

// const agentRouter = Router()

// async function rollbackConnections(userSession: UserSession, agentConfig: AgentConfig): Promise<void> {
//   console.log(`[Agent] Rolling back connections for agent '${agentConfig.id}' for user '${userSession.userId}'...`)
//   for (const serverToClean of agentConfig.mcpServers) {
//     if (serverToClean && typeof serverToClean === "object" && serverToClean.id) {
//       await cleanupExistingConnection(userSession, serverToClean.id)
//     }
//   }
// }

// /* Helper function to establish MCP connections for an agent */
// async function establishMcpConnectionsForAgent(
//   userSession: UserSession,
//   agentConfig: AgentConfig,
// ): Promise<{ success: boolean; error?: string }> {
//   const connectionPromises = agentConfig.mcpServers.map(async (mcpServer) => {
//     if (!mcpServer.config) {
//       const errorMessage = `No config found for MCP server ${mcpServer.id}`
//       console.error(`[Agent] ${errorMessage}`)
//       throw new Error(errorMessage)
//     }
//     console.log(
//       `[Agent] Attempting connection to MCP server: ${mcpServer.id} for agent ${agentConfig.id} for user ${userSession.userId}...`,
//     )
//     const result = await establishMcpConnection(userSession, mcpServer)
//     if (!result.success) {
//       const errorMessage = `Failed to establish connection to ${mcpServer.id}: ${result.error}`
//       console.error(
//         `[Agent] Failed to establish connection for ${mcpServer.id} (Agent: ${agentConfig.id}, User: ${userSession.userId}): ${String(result.error)}`,
//       )
//       throw new Error(errorMessage)
//     }
//     console.log(`[Agent] Successfully established connection to ${mcpServer.id} for user ${userSession.userId}`)
//     return { serverId: mcpServer.id, success: true }
//   })

//   try {
//     await Promise.all(connectionPromises)
//     console.log(
//       `[Agent] Successfully established all ${agentConfig.mcpServers.length} MCP connections for agent ${agentConfig.id} for user ${userSession.userId}`,
//     )
//     return { success: true }
//   } catch (error) {
//     console.error(
//       `[Agent] Failed to establish one or more MCP connections for agent ${agentConfig.id} for user ${userSession.userId}.`,
//     )
//     return {
//       success: false,
//       error: `Failed to establish one or more connections: ${String(error)}`,
//     }
//   }
// }

// /* Run agent and stream response using a chain of AI agents (Planner, Worker, etc.) */
// agentRouter.post("/run", async (expressReq: Request, res: Response): Promise<void> => {
//   const req = expressReq as RequestWithUserContext

//   const userSession: RequestWithUserContext["userSession"] = req.userSession
//   const { config, apiKey } = req.body as { config?: AgentConfig; apiKey?: string }

//   if (!apiKey) {
//     res.status(500).json({ success: false, message: "API key is required" })
//     return
//   }

//   if (!config || typeof config !== "object" || !config.id || !Array.isArray(config.mcpServers)) {
//     res.status(400).json({ success: false, message: "Invalid agent configuration: Missing id or mcpServers array" })
//     return
//   }

//   const agentConfig = config
//   console.log(`[Agent] Request for agent '${agentConfig.id}' for user '${userSession.userId}'`)

//   try {
//     const connectionResult = await establishMcpConnectionsForAgent(userSession, agentConfig)

//     if (!connectionResult.success) {
//       await rollbackConnections(userSession, agentConfig)
//       const statusCode = connectionResult.error?.includes("limit reached") ? 503 : 500
//       res.status(statusCode).json({ success: false, message: connectionResult.error })
//       return
//     }

//     let aiModel: LanguageModel
//     try {
//       aiModel = getModelInstance(agentConfig.modelId, apiKey) as LanguageModel
//     } catch {
//       await rollbackConnections(userSession, agentConfig)
//       res.status(500).json({ success: false, message: `AI Model '${agentConfig.modelId}' not configured on backend` })
//       return
//     }

//     const agentTools: ToolSet = {}

//     for (const serverConfig of agentConfig.mcpServers) {
//       const activeClient = userSession.activeMcpClients.get(serverConfig.id)
//       if (activeClient?.client.tools) {
//         Object.assign(agentTools, activeClient.client.tools)
//       }
//     }

//     console.log(
//       `[Agent] Starting AI agent chain for '${agentConfig.id}' (User: '${userSession.userId}') with model '${agentConfig.modelId}' and ${Object.keys(agentTools).length} tools`,
//     )

//     const initialChainMessages: CoreMessage[] = [{ role: "user", content: agentConfig.systemPrompt }]

//     await handleAiChainRequest(req, res, aiModel, initialChainMessages, agentTools)
//   } catch (error) {
//     console.error(
//       `[Agent] Unexpected error during agent run setup or AI chain execution for user ${userSession.userId}:`,
//       error,
//     )
//     if (agentConfig) {
//       await rollbackConnections(userSession, agentConfig)
//     }
//     if (!res.headersSent) {
//       res.status(500).json({ success: false, message: "An unexpected error occurred during agent execution" })
//     } else if (!res.writableEnded) {
//       res.end()
//     }
//   }
// })

// /* Stop all agent connections for a user */
// agentRouter.post("/stop", async (expressReq: Request, res: Response): Promise<void> => {
//   const req = expressReq as RequestWithUserContext
//   const { userSession } = req

//   console.log(`[Agent] Request to stop all connections for user '${userSession.userId}'`)

//   if (!userSession || userSession.activeMcpClients.size === 0) {
//     console.log(`[Agent] No active session or no connections found for user '${userSession.userId}'. Nothing to stop`)
//     res
//       .status(200)
//       .json({ success: true, message: "No active connections found for user or user session does not exist" })
//     return
//   }

//   const serverIdsToStop = [...userSession.activeMcpClients.keys()]
//   console.log(
//     `[Agent] Found ${serverIdsToStop.length} connections to stop for user '${userSession.userId}': ${serverIdsToStop.join(", ")}`,
//   )

//   try {
//     for (const serverId of serverIdsToStop) {
//       await cleanupExistingConnection(userSession, serverId)
//     }
//     console.log(
//       `[Agent] Successfully stopped all ${serverIdsToStop.length} connections for user '${userSession.userId}'`,
//     )
//     res
//       .status(200)
//       .json({ success: true, message: `All connections for user '${userSession.userId}' stopped successfully` })
//   } catch (error) {
//     console.error(`[Agent] Unexpected error while stopping connections for user ${userSession.userId}:`, error)
//     res.status(500).json({ success: false, message: "An unexpected error occurred while stopping connections" })
//   }
// })

// export default agentRouter
