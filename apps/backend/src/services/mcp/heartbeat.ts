import { convex } from "../../lib/convex-client"
import { logger } from "../../lib/logger"
import { api } from "@dojo/db/convex/_generated/api"

let heartbeatInterval: NodeJS.Timeout | null = null
let backendInstanceId: string

/**
 * Start the heartbeat service that periodically updates connection heartbeats
 */
export function startHeartbeat(instanceId: string) {
  backendInstanceId = instanceId

  // Update heartbeats every hour
  heartbeatInterval = setInterval(
    () => {
      void (async () => {
        try {
          const count = await convex.mutation(api.mcpConnections.updateHeartbeats, {
            backendInstanceId,
          })
          logger.debug("Heartbeat", `Updated ${count} connection heartbeats`)
        } catch (error) {
          logger.error("Heartbeat", "Failed to update heartbeats", error)
        }
      })()
    },
    60 * 60 * 1000, // 1 hour
  )

  logger.info("Heartbeat", "Service started")
}

/**
 * Stop the heartbeat service
 */
export function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval)
    heartbeatInterval = null
    logger.info("Heartbeat", "Service stopped")
  }
}

/**
 * Mark all connections from this backend as disconnected
 */
export async function disconnectAllBackendConnections() {
  if (!backendInstanceId) return

  try {
    const count = await convex.mutation(api.mcpConnections.disconnectByBackend, {
      backendInstanceId,
    })
    logger.info("Heartbeat", `Marked ${count} connections as disconnected`)
  } catch (error) {
    logger.error("Heartbeat", "Failed to disconnect backend connections", error)
  }
}
