import { systemConvexClient } from "../../lib/convex-request-client"
import { logger } from "../../lib/logger"
import { api } from "@dojo/db/convex/_generated/api"

let heartbeatInterval: NodeJS.Timeout | null = null
let backendInstanceId: string

/**
 * Start the heartbeat service that periodically updates connection heartbeats
 * 
 * IMPORTANT: The heartbeat interval must be less than the STALE_THRESHOLD in
 * mcpConnections.ts (currently 90 seconds) to prevent connections from being
 * incorrectly marked as stale.
 */
export function startHeartbeat(instanceId: string) {
  backendInstanceId = instanceId

  // Update heartbeats every 30 seconds (well below the 90 second stale threshold)
  heartbeatInterval = setInterval(
    () => {
      void (async () => {
        try {
          const count = await systemConvexClient.mutation(api.mcpConnections.updateHeartbeats, {
            backendInstanceId,
          })
          logger.debug("Heartbeat", `Updated ${count} connection heartbeats`)
        } catch (error) {
          logger.error("Heartbeat", "Failed to update heartbeats", error)
        }
      })()
    },
    30 * 1000, // 30 seconds
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
    const count = await systemConvexClient.mutation(api.mcpConnections.disconnectByBackend, {
      backendInstanceId,
    })
    logger.info("Heartbeat", `Marked ${count} connections as disconnected`)
  } catch (error) {
    logger.error("Heartbeat", "Failed to disconnect backend connections", error)
  }
}
