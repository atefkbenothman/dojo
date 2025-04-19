"use server"

import { v4 as uuid4 } from "uuid"
import { CoreMessage } from "ai"
import { asyncTryCatch } from "@/lib/utils"

const MCP_SERVICE_URL = process.env.MCP_SERVICE_URL || "http://localhost:8888"

/* Check health of MCP Client Server */
export async function checkMCPHealth(): Promise<{ success: boolean; error?: string }> {
  console.log(`[MCP Client] Checking health of MCP service at ${MCP_SERVICE_URL}/health`)

  const { data, error } = await asyncTryCatch(fetch(`${MCP_SERVICE_URL}/health`, {
    method: "GET",
    headers: {
      "Accept": "application/json"
    },
    cache: "no-store"
  }))

  if (error || !data) {
    return { success: false, error: error?.message || "Service unavailable" }
  }

  const health = await data.json()
  return { success: health.status === "ok" }
}

/* Connect to MCP Client Server */
export async function connectMCP(currentSessionId: string | null, serverId: string, userArgs?: string[]): Promise<{ sessionId: string | undefined}> {
  let sessionId = currentSessionId || uuid4()

  console.log(`[MCP Client] Connecting to server '${serverId}' with session ID: ${sessionId}`)

  const mcpServiceURL = `${MCP_SERVICE_URL}/connect`
  const { data, error } = await asyncTryCatch(fetch(mcpServiceURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ sessionId, serverId, userArgs }),
    cache: "no-store"
  }))

  if (error || !data) {
    console.error(`[MCP Client] Connection failed for session ${sessionId}:`, error)
    return { sessionId: undefined }
  }

  const connection = await data.json()

  if (connection.message === "Already connected") {
    console.log(`[MCP Client] Session ${sessionId} is already connected to server '${serverId}'`)
  } else {
    console.log(`[MCP Client] Successfully connected session ${sessionId} to server '${serverId}'`)
  }

  return { sessionId }
}


/* Disconnect from MCP Client Server */
export async function disconnectMCP(sessionId: string | null): Promise<{ success: boolean; error?: string }> {
  if (!sessionId) {
    console.log("[MCP Client] No sessionId provided for disconnect")
    return { success: false }
  }

  console.log(`[MCP Client] Disconnecting session ${sessionId}`)

  const { data, error } = await asyncTryCatch(fetch(`${MCP_SERVICE_URL}/disconnect`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sessionId }),
    cache: "no-store"
  }))

  if (error || !data) {
    console.error(`[MCP Client] Disconnect failed for session ${sessionId}:`, error)
    return { success: false, error: "Disconnect failed" }
  }

  console.log(`[MCP Client] Successfully disconnected session ${sessionId}`)
  return { success: true }
}


/* Send a chat to MCP Client Server */
export async function sendChatMCP(sessionId: string | null, modelId: string, messages: CoreMessage[]): Promise<{ response?: string; error?: string }> {
  if (!messages || messages.length === 0) {
    console.warn("[MCP Client] Cannot send chat, message is empty")
    return { error: "Cannot send an empty message" }
  }

  console.log(`[MCP Client] Sending chat to model ${modelId} for session ${sessionId}`)

  const { data, error } = await asyncTryCatch(fetch(`${MCP_SERVICE_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sessionId, messages, modelId }),
    cache: "no-store",
  }))

  if (error || !data) {
    console.error(`[MCP Client] Chat request failed for session ${sessionId}:`, error)
    return { error: "Chat request failed" }
  }

  const response = await data.json()

  console.log(`[MCP Client] Successfully sent chat for session ${sessionId}`)
  return { response: response.response }
}


/* Get available MCP Services from Client Server */
export async function getAvailableMCPServers() {
  console.log(`[MCP Client] Fetching available servers from ${MCP_SERVICE_URL}/servers`)

  const { data, error } = await asyncTryCatch(fetch(`${MCP_SERVICE_URL}/servers`, {
    method: "GET",
    headers: {
      "Accept": "application/json"
    },
    cache: "no-store"
  }))

  if (error || !data) {
    return { error: "Failed to get available servers" }
  }

  const servers = await data.json()

  console.log(`[MCP Client] Successfully fetched available servers`)
  return { servers: servers.servers }
}
