import { convex } from "../../lib/convex-client"
import { api } from "@dojo/db/convex/_generated/api"

let heartbeatInterval: NodeJS.Timeout | null = null
let backendInstanceId: string

/**
 * Start the heartbeat service that periodically updates connection heartbeats
 */
export function startHeartbeat(instanceId: string) {
  backendInstanceId = instanceId

  // Update heartbeats every 30 seconds
  heartbeatInterval = setInterval(() => {
    void (async () => {
      try {
        const count = await convex.mutation(api.mcpConnections.updateHeartbeats, {
          backendInstanceId,
        })
        console.log(`[Heartbeat] Updated ${count} connection heartbeats`)
      } catch (error) {
        console.error("[Heartbeat] Failed to update heartbeats:", error)
      }
    })()
  }, 30 * 1000) // 30 seconds

  console.log("[Heartbeat] Service started")
}

/**
 * Stop the heartbeat service
 */
export function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval)
    heartbeatInterval = null
    console.log("[Heartbeat] Service stopped")
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
    console.log(`[Heartbeat] Marked ${count} connections as disconnected`)
  } catch (error) {
    console.error("[Heartbeat] Failed to disconnect backend connections:", error)
  }
}
