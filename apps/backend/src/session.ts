import type { ActiveMcpClient, UserSession } from "./types.js"
import { Id } from "@dojo/db/convex/_generated/dataModel.js"

export const sessions = new Map<Id<"users">, UserSession>()

export let totalConnections = 0

export const MAX_CONNECTIONS = 10

export function getOrCreateUserSession(userId: Id<"users">): UserSession {
  if (!sessions.has(userId)) {
    sessions.set(userId, { userId: userId, activeMcpClients: new Map<string, ActiveMcpClient>() })
  }
  return sessions.get(userId)!
}

export function incrementTotalConnections() {
  totalConnections++
}

export function decrementTotalConnections() {
  totalConnections--
}
