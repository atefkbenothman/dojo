import type { AIModel, MCPServer, AgentConfig } from "./types.js"
import type { AgentWorkflow } from "./types.js"
import { z } from "zod"
import { zodToJsonSchema } from "zod-to-json-schema"

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
      args: ["-y", "@supabase/mcp-server-supabase@latest", "--access-token", "ACCESS_TOKEN"],
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
      env: { TICKETMASTER_API_KEY: "REPLACE_ME" },
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
      env: { NOTION_API_KEY: "REPLACE_ME" },
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

export const PlannerAgentPlanSchema = z.object({
  objective: z.string().describe("The overall objective of the plan."),
  steps: z.array(z.string()).describe("A list of detailed steps to achieve the objective."),
})

const PlannerAgentPlanJsonSchema = zodToJsonSchema(PlannerAgentPlanSchema)

export const AGENT_CONFIGS: Record<string, AgentConfig> = {
  "code-wizard-001": {
    id: "code-wizard-001",
    name: "Code Wizard",
    systemPrompt:
      "You are an expert AI pair programmer. You specialize in Next.js, TypeScript, and Tailwind CSS. Adhere to the specified coding style and best practices. Assist with code generation, debugging, and explaining complex concepts.",
    aiModelId: AI_MODELS["gemini-2.0-flash-001"]!.id,
    output: {
      type: "text",
      mcpServers: [CONFIGURED_MCP_SERVERS.github!, CONFIGURED_MCP_SERVERS.filesystem!],
    },
  },
  "code-wizard-002": {
    id: "code-wizard-002",
    name: "Code Wizard 2",
    systemPrompt:
      "You are an expert AI pair programmer. You specialize in Next.js, TypeScript, and Tailwind CSS. Adhere to the specified coding style and best practices. Assist with code generation, debugging, and explaining complex concepts.",
    aiModelId: AI_MODELS["gemini-2.0-flash-001"]!.id,
    output: {
      type: "text",
      mcpServers: [
        CONFIGURED_MCP_SERVERS.context7!,
        CONFIGURED_MCP_SERVERS.ticketmaster!,
        CONFIGURED_MCP_SERVERS.supabase!,
      ],
    },
  },
  "research-pro-002": {
    id: "research-pro-002",
    name: "Research Pro",
    systemPrompt:
      "You are an AI research assistant. Your goal is to find and synthesize information from technical documentation and web sources. Provide concise and accurate answers with references.",
    aiModelId: AI_MODELS["gemini-1.5-flash"]!.id,
    output: {
      type: "text",
      mcpServers: [CONFIGURED_MCP_SERVERS.context7!],
    },
  },
  "notion-organizer-003": {
    id: "notion-organizer-003",
    name: "Notion Organizer",
    systemPrompt:
      "You are an AI assistant for Notion. Help organize notes, manage tasks, and retrieve information from Notion workspaces.",
    aiModelId: AI_MODELS["qwen-qwq-32b"]!.id,
    output: {
      type: "text",
      mcpServers: [CONFIGURED_MCP_SERVERS.notion!],
    },
  },
  "sports-event-analyst-001": {
    id: "sports-event-analyst-001",
    name: "Sports Event Analyst",
    systemPrompt:
      "You are an AI assistant that helps analyze data and code.\n1. Use the Ticketmaster tools to find all sport events in San Francisco happening between May 19, 2025 and May 27, 2025.\n2. Use the Supabase tools to create a new table in the database.\n3. Insert the data retrieved from the Ticketmaster API into the newly created Supabase table.\n4. Synthesize information from these sources to answer user queries comprehensively.\n5. If asked to modify files or database tables, always ask for confirmation first unless explicitly told to proceed.",
    aiModelId: AI_MODELS["gemini-2.0-flash-001"]!.id,
    output: {
      type: "text",
      mcpServers: [CONFIGURED_MCP_SERVERS.supabase!, CONFIGURED_MCP_SERVERS.ticketmaster!],
    },
  },
  "planner-agent-001": {
    id: "planner-agent-001",
    name: "Planner Agent",
    systemPrompt:
      "You are an expert planning assistant. Analyze the user's request and formulate a detailed, step-by-step plan. The plan should be structured according to the provided schema.",
    aiModelId: AI_MODELS["gemini-2.0-flash-001"]!.id,
    output: {
      type: "object",
      objectJsonSchema: PlannerAgentPlanJsonSchema,
    },
  },
  "file-summary-001": {
    id: "file-summary-001",
    name: "File Summarizer",
    systemPrompt: "Summarize the contents of the given file path in a concise paragraph.",
    aiModelId: AI_MODELS["gemini-1.5-flash"]!.id,
    output: {
      type: "text",
      mcpServers: [CONFIGURED_MCP_SERVERS.filesystem!],
    },
  },
  "doc-explainer-001": {
    id: "doc-explainer-001",
    name: "Doc Explainer",
    systemPrompt: "Explain the main purpose of the provided documentation snippet.",
    aiModelId: AI_MODELS["gemini-1.5-flash"]!.id,
    output: {
      type: "text",
      mcpServers: [CONFIGURED_MCP_SERVERS.context7!],
    },
  },
  "web-checker-001": {
    id: "web-checker-001",
    name: "Web Checker",
    systemPrompt: "Visit the provided URL and return the page title and a short summary.",
    aiModelId: AI_MODELS["gemini-2.0-flash-001"]!.id,
    output: {
      type: "text",
      mcpServers: [CONFIGURED_MCP_SERVERS.playwright!],
    },
  },
}

export const AGENT_WORKFLOWS: Record<string, AgentWorkflow> = {
  "simple-file-to-doc-explanation": {
    id: "simple-file-to-doc-explanation",
    name: "File to Doc Explanation",
    description: "Summarize a file, then explain its documentation using chained agents.",
    prompt: "Summarize the file at ./README.md and explain its main purpose.",
    steps: [
      {
        id: "step-1-summarize-file",
        agentConfigId: "file-summary-001",
      },
      {
        id: "step-2-explain-doc",
        agentConfigId: "doc-explainer-001",
      },
    ],
  },
}
