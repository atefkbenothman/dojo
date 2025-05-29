import type { AIModel, MCPServer, AgentConfig } from "./types.js"

export const PROVIDERS = {
  google: {
    id: "google",
    name: "Google",
  },
  openai: {
    id: "openai",
    name: "OpenAI",
  },
  groq: {
    id: "groq",
    name: "Groq",
  },
} as const

export type ProviderId = keyof typeof PROVIDERS

export const AI_MODELS: Record<string, AIModel> = {
  "gemini-1.5-flash": {
    id: "gemini-1.5-flash",
    modelName: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
    type: "text",
    provider: "google",
    requiresApiKey: true,
  },
  "gemini-2.0-flash-001": {
    id: "gemini-2.0-flash-001",
    modelName: "gemini-2.0-flash-001",
    name: "Gemini 2.0 Flash",
    type: "text",
    provider: "google",
    requiresApiKey: true,
  },
  "qwen-qwq-32b": {
    id: "qwen-qwq-32b",
    modelName: "qwen-qwq-32b",
    name: "Qwen QWQ 32B",
    type: "text",
    provider: "groq",
    requiresApiKey: false,
  },
  "deepseek-r1-distill-llama-70b": {
    id: "deepseek-r1-distill-llama-70b",
    modelName: "deepseek-r1-distill-llama-70b",
    name: "Deepseek R1 Distill Llama 70B",
    type: "text",
    provider: "groq",
    requiresApiKey: false,
  },
  "gpt-image-1": {
    id: "gpt-image-1",
    modelName: "gpt-image-1",
    name: "GPT Image 1",
    type: "image",
    provider: "openai",
    requiresApiKey: true,
  },
} as const

export const CONFIGURED_MCP_SERVERS: Record<string, MCPServer> = {
  supabase: {
    id: "supabase",
    name: "Supabase",
    summary: "Connect directly to the cloud platform to access your database",
    requiresUserKey: true,
    config: {
      command: "npx",
      args: ["-y", "@supabase/mcp-server-supabase@latest", "--access-token", "ACCESS_TOEN"],
    },
  },
  github: {
    id: "github",
    name: "Github",
    summary: "Repository management, file operations, and GitHub API integration",
    localOnly: true,
    config: {
      command: "docker-compose",
      args: ["run", "--rm", "github-mcp-server"],
    },
  },
  ticketmaster: {
    id: "ticketmaster",
    name: "Ticketmaster",
    summary: "Manage ticket sales and event management",
    requiresUserKey: true,
    config: {
      command: "npx",
      args: ["-y", "@delorenj/mcp-server-ticketmaster"],
      requiresEnv: ["TICKETMASTER_API_KEY"],
    },
  },
  context7: {
    id: "context7",
    name: "Context7",
    summary: "Up-to-date code docs for any prompt",
    requiresUserKey: false,
    config: {
      command: "npx",
      args: ["-y", "@upstash/context7-mcp@latest"],
    },
  },
  playwright: {
    id: "playwright",
    name: "Playwright",
    summary: "Run browser automation and webscraping",
    localOnly: true,
    config: {
      command: "npx",
      args: ["-y", "@playwright/mcp@latest", "--browser", "chrome"],
    },
  },
  notion: {
    id: "notion",
    name: "Notion",
    summary: "Interact with the Notion API",
    requiresUserKey: true,
    config: {
      command: "npx",
      args: ["-y", "@notionhq/notion-mcp-server"],
      requiresEnv: ["NOTION_API_KEY"],
    },
  },
  blender: {
    id: "blender",
    name: "Blender",
    summary: "Enable prompt assisted 3D modeling, scene creation, and manipulation",
    localOnly: true,
    config: {
      command: "uvx",
      args: ["blender-mcp"],
    },
  },
  filesystem: {
    id: "filesystem",
    name: "Filesystem",
    summary: "Secure file operations with configurable access controls",
    localOnly: true,
    config: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem", "PATH_TO_DIRECTORY"],
    },
  },
  figma: {
    id: "figma",
    name: "Figma",
    summary: "Collaborative design and prototyping",
    localOnly: true,
  },
}

export const AGENT_CONFIGS: AgentConfig[] = [
  {
    id: "code-wizard-001",
    name: "Code Wizard",
    systemPrompt:
      "You are an expert AI pair programmer. You specialize in Next.js, TypeScript, and Tailwind CSS. Adhere to the specified coding style and best practices. Assist with code generation, debugging, and explaining complex concepts.",
    aiModelId: AI_MODELS["gemini-2.0-flash-001"]!.id,
    context: "Next.js App Router, TypeScript, React, Shadcn UI, Tailwind CSS",
    mcpServers: [CONFIGURED_MCP_SERVERS.github!, CONFIGURED_MCP_SERVERS.filesystem!],
  },
  {
    id: "research-pro-002",
    name: "Research Pro",
    systemPrompt:
      "You are an AI research assistant. Your goal is to find and synthesize information from technical documentation and web sources. Provide concise and accurate answers with references.",
    aiModelId: AI_MODELS["gemini-1.5-flash"]!.id,
    context: "Technical documentation research, API specifications, library usage",
    mcpServers: [CONFIGURED_MCP_SERVERS.context7!],
  },
  {
    id: "notion-organizer-003",
    name: "Notion Organizer",
    systemPrompt:
      "You are an AI assistant for Notion. Help organize notes, manage tasks, and retrieve information from Notion workspaces.",
    aiModelId: AI_MODELS["qwen-qwq-32b"]!.id,
    context: "Notion workspace management, task tracking, note taking",
    mcpServers: [CONFIGURED_MCP_SERVERS.notion!],
  },
]
