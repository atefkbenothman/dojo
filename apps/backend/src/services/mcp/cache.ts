import type { ActiveMcpClient } from "../../lib/types"
import { Id } from "@dojo/db/convex/_generated/dataModel"

/**
 * A simple in-memory cache to store active MCP client connections.
 * The outer map is keyed by the session ID (from the database).
 * The inner map is keyed by the MCP server ID.
 */
export const liveConnectionCache = new Map<Id<"sessions">, Map<Id<"mcp">, ActiveMcpClient>>()
