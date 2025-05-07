import {
  BlenderIcon,
  FigmaIcon,
  GitHubIcon,
  PlaywrightIcon,
  SupabaseIcon,
  TicketmasterIcon,
  Upstash,
} from "@/components/icons/icons"
import type { AIModelInfo, MCPConfigs } from "@/lib/types"

export const SYSTEM_PROMPT = `You are a helpful assistant with access to a variety of tools.

The tools are very powerful, and you can use them to answer the user's question.
So choose the tool that is most relevant to the user's question.

You can use multiple tools in a single response.
Always respond after using the tools for better user experience.
You can run multiple steps using all the tools!
Make sure to use the right tool to respond to the user's question.

Multiple tools can be used in a single response and multiple steps can be used to answer the user's question.

## Response Format
- Markdown is supported.
- Respond according to tool's response.
- Use the tools to answer the user's question.
- If you don't know the answer, use the tools to find the answer or say you don't know.`

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
  context7: {
    id: "context7",
    name: "Context7",
    command: "npx",
    args: ["-y", "@upstash/context7-mcp@latest"],
    icon: <Upstash />,
  },
}
