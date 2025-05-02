import {
  BlenderIcon,
  FigmaIcon,
  GitHubIcon,
  PlaywrightIcon,
  SupabaseIcon,
  TicketmasterIcon,
} from "@/components/icons/icons"
import type { AIModelInfo, MCPConfigs } from "./types"

export const AVAILABLE_MODELS: AIModelInfo[] = [
  {
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
    type: "text",
  },
  {
    id: "gemini-2.0-flash-001",
    name: "Gemini 2.0 Flash",
    type: "text",
  },
  {
    id: "deepseek-r1-distill-llama-70b",
    name: "Deepseek R1",
    type: "text",
  },
  {
    id: "gpt-image-1",
    name: "GPT Image 1",
    type: "image",
  },
]

export const DEFAULT_MODEL_ID = "gemini-1.5-flash"

export const MCP_CONFIG: MCPConfigs = {
  github: {
    id: "github",
    name: "Github",
    command: "docker-compose",
    args: ["run", "--rm", "github-mcp-server"],
    icon: <GitHubIcon />,
  },
  blender: {
    id: "blender",
    name: "Blender",
    command: "uvx",
    args: ["blender-mcp"],
    icon: <BlenderIcon />,
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
    icon: <SupabaseIcon />,
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
    icon: <PlaywrightIcon />,
  },
  ticketmaster: {
    id: "ticketmaster",
    name: "Ticketmaster",
    command: "npx",
    args: ["-y", "@delorenj/mcp-server-ticketmaster"],
    env: {
      TICKETMASTER_API_KEY: process.env.NEXT_PUBLIC_TICKETMASTER_API_KEY || "",
    },
    icon: <TicketmasterIcon />,
  },
  figma: {
    id: "figma",
    name: "Figma",
    command: "bunx",
    args: ["cursor-talk-to-figma-mcp@latest"],
    icon: <FigmaIcon />,
  },
}
