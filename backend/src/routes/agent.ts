import { Router, Request, Response } from "express"
import { establishMcpConnection, cleanupExistingConnection } from "../mcp-connection"
import { sessions } from "../core"
import type { AgentConfig } from "../types"

const agentRouter = Router()

async function rollbackConnections(sessionId: string, agentConfig: AgentConfig): Promise<void> {
  console.log(`[Agent] Rolling back connections for agent '${agentConfig.id}' in session '${sessionId}'...`)
  for (const serverToClean of agentConfig.mcpServers) {
    if (serverToClean && typeof serverToClean === "object" && serverToClean.id) {
      await cleanupExistingConnection(sessionId, serverToClean.id)
    }
  }
}

/* Run agent */
agentRouter.post("/run", async (req: Request, res: Response): Promise<void> => {
  const { sessionId, config } = req.body

  if (!config || typeof config !== "object" || !Array.isArray(config.mcpServers)) {
    res.status(400).json({ success: false, message: "Invalid agent configuration: Missing id or mcpServers array" })
    return
  }

  const agentConfig = config as AgentConfig
  console.log(`[Agent] Request for agent '${agentConfig.id}' in session '${sessionId}'`)

  try {
    for (const mcpServerConfig of agentConfig.mcpServers) {
      console.log(`[Agent] Attempting connection to MCP server: ${mcpServerConfig.id} for agent ${agentConfig.id}...`)
      const result = await establishMcpConnection(sessionId, mcpServerConfig)

      if (!result.success) {
        console.error(
          `[Agent] Failed to establish connection for ${mcpServerConfig.id} (Agent: ${agentConfig.id}): ${result.error}`,
        )
        await rollbackConnections(sessionId, agentConfig)
        const statusCode = result.error?.includes("limit reached") ? 503 : 500
        res
          .status(statusCode)
          .json({ success: false, message: `Failed to establish connection to ${mcpServerConfig.id}: ${result.error}` })
        return
      }
      console.log(`[Agent] Successfully established connection to ${mcpServerConfig.id}`)
    }

    console.log(
      `[Agent] Successfully established all ${agentConfig.mcpServers.length} MCP connections for agent ${agentConfig.id}`,
    )
    // TODO: Implement actual agent execution logic here
    res.status(200).json({ success: true, message: `Agent '${agentConfig.id}' connections ready` })
    return
  } catch (error) {
    console.error(`[Agent] Unexpected error during agent run setup for session ${sessionId}:`, error)
    await rollbackConnections(sessionId, agentConfig)
    res.status(500).json({ success: false, message: "An unexpected error occurred during agent setup" })
    return
  }
})

/* Stop all agent connections for a session */
agentRouter.post("/stop", async (req: Request, res: Response): Promise<void> => {
  const { sessionId } = req.body

  if (!sessionId || typeof sessionId !== "string") {
    res.status(400).json({ success: false, message: "Missing or invalid sessionId" })
    return
  }

  console.log(`[Agent /stop] Request to stop all connections for session '${sessionId}'`)

  const userSession = sessions.get(sessionId)

  if (!userSession || userSession.activeMcpClients.size === 0) {
    console.log(`[Agent /stop] No active session or no connections found for session '${sessionId}'. Nothing to stop.`)
    res
      .status(200)
      .json({ success: true, message: "No active connections found for session or session does not exist." })
    return
  }

  const serverIdsToStop = [...userSession.activeMcpClients.keys()]
  console.log(
    `[Agent /stop] Found ${serverIdsToStop.length} connections to stop for session '${sessionId}': ${serverIdsToStop.join(", ")}`,
  )

  try {
    for (const serverId of serverIdsToStop) {
      await cleanupExistingConnection(sessionId, serverId)
    }
    console.log(
      `[Agent /stop] Successfully stopped all ${serverIdsToStop.length} connections for session '${sessionId}'.`,
    )
    res.status(200).json({ success: true, message: `All connections for session '${sessionId}' stopped successfully.` })
  } catch (error) {
    console.error(`[Agent /stop] Unexpected error while stopping connections for session ${sessionId}:`, error)
    res.status(500).json({ success: false, message: "An unexpected error occurred while stopping connections." })
  }
})

export default agentRouter
