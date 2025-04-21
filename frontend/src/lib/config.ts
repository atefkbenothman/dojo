import type { MCPConfigs } from "./types"

export const MCP_CONFIG: MCPConfigs = {
  github: {
    id: "github",
    name: "Github",
    command: "docker-compose",
    args: ["run", "--rm", "github-mcp-server"],
  },
  blender: {
    id: "blender",
    name: "Blender",
    command: "uvx",
    args: ["blender-mcp"],
  },
  supabase: {
    id: "supabase",
    name: "Supabase",
    command: "npx",
    args: [
      "-y",
      "@supabase/mcp-server-supabase@latest",
      "--access-token",
      process.env.NEXT_PUBLIC_SUPABASE_ACCESS_TOKEN || "",
    ],
  },
  filesystem: {
    id: "filesystem",
    name: "Filesystem",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem"],
  },
  playwright: {
    id: "playwright",
    name: "Playwright",
    command: "npx",
    args: ["-y", "@playwright/mcp@latest", "--browser", "chrome"],
  },
  ticketmaster: {
    id: "ticketmaster",
    name: "Ticketmaster",
    command: "npx",
    args: ["-y", "@delorenj/mcp-server-ticketmaster"],
    env: {
      TICKETMASTER_API_KEY: process.env.NEXT_PUBLIC_TICKETMASTER_API_KEY || "",
    },
  },
  figma: {
    id: "figma",
    name: "Figma",
    command: "bunx",
    args: ["cursor-talk-to-figma-mcp@latest"],
  },
}
