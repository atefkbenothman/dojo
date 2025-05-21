import type { AIModel, AgentConfig, MCPServer } from "./types.js"

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
  },
  "gemini-2.0-flash-001": {
    id: "gemini-2.0-flash-001",
    modelName: "gemini-2.0-flash-001",
    name: "Gemini 2.0 Flash",
    type: "text",
    provider: "google",
  },
  "qwen-qwq-32b": {
    id: "qwen-qwq-32b",
    modelName: "qwen-qwq-32b",
    name: "Qwen QWQ 32B",
    type: "text",
    provider: "groq",
  },
  "deepseek-r1-distill-llama-70b": {
    id: "deepseek-r1-distill-llama-70b",
    modelName: "deepseek-r1-distill-llama-70b",
    name: "Deepseek R1 Distill Llama 70B",
    type: "text",
    provider: "groq",
  },
  "gpt-image-1": {
    id: "gpt-image-1",
    modelName: "gpt-image-1",
    name: "GPT Image 1",
    type: "image",
    provider: "openai",
  },
}

export const CONFIGURED_MCP_SERVERS: Record<string, MCPServer> = {
  supabase: {
    id: "supabase",
    name: "Supabase",
    summary: "Connect directly to the cloud platform to access your database",
    requiresUserKey: true,
    config: {
      command: "npx",
      args: ["-y", "@supabase/mcp-server-supabase@latest", "--access-token", ""],
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
  },
  // github: {
  //   id: "github",
  //   name: "Github",
  //   summary: "Repository management, file operations, and GitHub API integration",
  // },
  // blender: {
  //   id: "blender",
  //   name: "Blender",
  //   summary: "Enable prompt assisted 3D modeling, scene creation, and manipulation",
  // },
  // filesystem: {
  //   id: "filesystem",
  //   name: "Filesystem",
  //   summary: "Secure file operations with configurable access controls",
  // },
  // figma: {
  //   id: "figma",
  //   name: "Figma",
  //   summary: "Collaborative design and prototyping",
  // },
}

export const CONFIGURED_AGENTS: Record<string, AgentConfig> = {
  data_analysis: {
    id: "sports_event_analyst_agent",
    name: "Sports Event Analyst",
    modelId: "gemini-2.0-flash-001",
    systemPrompt: `You are an AI assistant that helps analyze data and code.\n1. Use the Ticketmaster tools to find all sport events in San Francisco happening between May 19, 2025 and May 27, 2025.\n2. Use the Supabase tools to create a new table in the database.\n3. Insert the data retrieved from the Ticketmaster API into the newly created Supabase table.\n4. Synthesize information from these sources to answer user queries comprehensively.\n5. If asked to modify files or database tables, always ask for confirmation first unless explicitly told to proceed.`,
    mcpServers: [CONFIGURED_MCP_SERVERS["supabase"]!, CONFIGURED_MCP_SERVERS["ticketmaster"]!],
    maxExecutionSteps: 15,
  },
}
