import { wrapLanguageModel, extractReasoningMiddleware } from "ai"
import { createGroq } from "@ai-sdk/groq"
import { createOpenAI } from "@ai-sdk/openai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import type { AIImageModelConfig, AIModelConfig, MCPServer } from "./types"

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

if (!process.env.GOOGLE_API_KEY) {
  console.error("[config] GOOGLE_API_KEY is missing or invalid")
}
if (!process.env.GROQ_API_KEY) {
  console.error("[config] GROQ_API_KEY is missing or invalid")
}
if (!process.env.OPENAI_API_KEY) {
  console.error("[config] OPENAI_API_KEY is missing or invalid")
}

export const AVAILABLE_AI_MODELS: Record<string, AIModelConfig> = {
  "gemini-1.5-flash": {
    name: "Google Gemini 1.5 Flash",
    modelName: "gemini-1.5-flash",
    languageModel: wrapLanguageModel({
      model: createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_API_KEY })("gemini-1.5-flash"),
      middleware: extractReasoningMiddleware({ tagName: "think" }),
    }),
  },
  "gemini-2.0-flash-001": {
    name: "Google Gemini 2.0 Flash",
    modelName: "gemini-2.0-flash-001",
    languageModel: wrapLanguageModel({
      model: createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_API_KEY })("gemini-2.0-flash-001"),
      middleware: extractReasoningMiddleware({ tagName: "think" }),
    }),
  },
  "deepseek-r1-distill-llama-70b": {
    name: "Deepseek",
    modelName: "deepseek-r1-distill-llama-70b",
    languageModel: wrapLanguageModel({
      model: createGroq({ apiKey: process.env.GROQ_API_KEY })("deepseek-r1-distill-llama-70b"),
      middleware: extractReasoningMiddleware({ tagName: "think" }),
    }),
  },
} as const

export const AVAILABLE_IMAGE_MODELS: Record<string, AIImageModelConfig> = {
  "gpt-image-1": {
    name: "OpenAI Image 1",
    modelName: "gpt-image-1",
    imageModel: createOpenAI({ apiKey: process.env.OPENAI_API_KEY }).image("gpt-image-1"),
    provider: "openai",
  },
} as const

export const AVAILABLE_MCP_SERVERS: Record<string, MCPServer> = {
  github: {
    id: "github",
    name: "Github",
    summary: "Repository management, file operations, and GitHub API integration",
  },
  blender: {
    id: "blender",
    name: "Blender",
    summary: "Enable prompt assisted 3D modeling, scene creation, and manipulation",
  },
  supabase: {
    id: "supabase",
    name: "Supabase",
    summary: "Connect directly to the cloud platform to access your database",
  },
  filesystem: {
    id: "filesystem",
    name: "Filesystem",
    summary: "Secure file operations with configurable access controls",
  },
  playwright: {
    id: "playwright",
    name: "Playwright",
    summary: "Run browser automation and webscraping",
  },
  ticketmaster: {
    id: "ticketmaster",
    name: "Ticketmaster",
    summary: "Manage ticket sales and event management",
  },
  figma: {
    id: "figma",
    name: "Figma",
    summary: "Collaborative design and prototyping",
  },
} as const

export const DEFAULT_MODEL_ID = "gemini-1.5-flash"
export const DEFAULT_IMAGE_MODEL_ID = "gpt-image-1"
