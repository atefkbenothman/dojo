import type { MCPFormValues } from "./mcp-form-schema"
import type { Doc } from "@dojo/db/convex/_generated/dataModel"
import type { MCPServer, AllowedStdioCommand } from "@dojo/db/convex/types"
import { WithoutSystemFields } from "convex/server"

// Helper function to create MCP object from form data
export function createMCPObject(data: MCPFormValues): WithoutSystemFields<Doc<"mcp">> {
  const base = {
    name: data.name,
    summary: data.summary,
    transportType: data.transportType,
    localOnly: data.transportType === "stdio",
  }

  switch (data.transportType) {
    case "stdio": {
      const args = (data.argsString || "")
        .split(",")
        .map((arg) => arg.trim())
        .filter(Boolean)

      // Filter out empty environment variables (similar to headers)
      const envPairsList = data.envPairs || []
      const validEnvPairs = envPairsList.filter((pair) => pair.key && pair.value)
      const env = Object.fromEntries(validEnvPairs.map((pair) => [pair.key, pair.value]))

      return {
        ...base,
        requiresUserKey: validEnvPairs.length > 0,
        config: {
          type: "stdio" as const,
          command: (data.command || "npx") as AllowedStdioCommand,
          args,
          ...(validEnvPairs.length > 0 && {
            env,
            requiresEnv: validEnvPairs.map((pair) => pair.key),
          }),
        },
      }
    }

    case "http":
    case "sse": {
      const headersList = data.headers || []
      const headers = Object.fromEntries(headersList.filter((h) => h.key && h.value).map((h) => [h.key, h.value]))

      // Check if any valid headers indicate user key requirement
      const validHeaders = headersList.filter((h) => h.key && h.value)
      const requiresUserKey = validHeaders.some(
        (h) => h.value.includes("{{") || h.key.toLowerCase() === "authorization",
      )

      return {
        ...base,
        requiresUserKey,
        config: {
          type: data.transportType,
          url: data.url || "",
          ...(Object.keys(headers).length > 0 && { headers }),
        },
      }
    }
  }
}

// Helper function to get default form values with all fields initialized
export function getDefaultFormValues(server?: MCPServer): MCPFormValues {
  // Base values that all transport types share
  const baseValues = {
    name: server?.name || "",
    summary: server?.summary || "",
    // Initialize all possible fields to ensure they exist in form state
    command: "npx" as AllowedStdioCommand,
    argsString: "",
    envPairs: [] as Array<{ key: string; value: string }>,
    url: "",
    headers: [] as Array<{ key: string; value: string }>,
  }

  if (!server) {
    return {
      ...baseValues,
      transportType: "stdio" as const,
    }
  }

  // Override with actual server values based on transport type
  if (server.transportType === "http" || server.transportType === "sse") {
    const headers =
      server.config && "headers" in server.config && server.config.headers
        ? Object.entries(server.config.headers).map(([key, value]) => ({ key, value }))
        : []

    return {
      ...baseValues,
      transportType: server.transportType,
      url: server.config && "url" in server.config ? server.config.url : "",
      headers,
    }
  } else {
    // stdio transport type
    let envPairs: Array<{ key: string; value: string }> = []
    let command = "npx" as AllowedStdioCommand
    let argsString = ""

    if (server.config && server.config.type === "stdio") {
      const stdioConfig = server.config
      const requiredKeys = stdioConfig.requiresEnv || []
      const configEnv = stdioConfig.env || {}
      envPairs = requiredKeys.map((key: string) => ({
        key,
        value: configEnv[key] || "",
      }))
      command = (stdioConfig.command || "npx") as AllowedStdioCommand
      argsString = (stdioConfig.args || []).join(", ")
    }

    return {
      ...baseValues,
      transportType: "stdio" as const,
      command,
      argsString,
      envPairs,
    }
  }
}
