import type { AIImageModelConfig, AIModelConfig, MCPServer } from "@/types"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createGroq } from "@ai-sdk/groq"
import { createOpenAI } from "@ai-sdk/openai"
import { wrapLanguageModel, extractReasoningMiddleware } from "ai"
import dotenv from "dotenv"
import * as path from "path"

dotenv.config({
  path: path.resolve(__dirname, "..", ".env"),
})

if (!process.env.GOOGLE_API_KEY) {
  console.error("[Config] GOOGLE_API_KEY is missing or invalid")
}
if (!process.env.GROQ_API_KEY) {
  console.error("[Config] GROQ_API_KEY is missing or invalid")
}
if (!process.env.OPENAI_API_KEY) {
  console.error("[Config] OPENAI_API_KEY is missing or invalid")
}

export const WATCH_DIRECTORY_PATH = process.env.WATCH_DIRECTORY || path.resolve(__dirname, "../data")

export const DEFAULT_MODEL_ID = "gemini-1.5-flash"
export const DEFAULT_IMAGE_MODEL_ID = "gpt-image-1"

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
  "qwen-qwq-32b": {
    name: "Qwen QWQ 32B",
    modelName: "qwen-qwq-32b",
    languageModel: wrapLanguageModel({
      model: createGroq({ apiKey: process.env.GROQ_API_KEY })("qwen-qwq-32b"),
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
  supabase: {
    id: "supabase",
    name: "Supabase",
    summary: "Connect directly to the cloud platform to access your database",
  },
  // filesystem: {
  //   id: "filesystem",
  //   name: "Filesystem",
  //   summary: "Secure file operations with configurable access controls",
  // },
  notion: {
    id: "notion",
    name: "Notion",
    summary: "Interact with the Notion API",
  },
  // playwright: {
  //   id: "playwright",
  //   name: "Playwright",
  //   summary: "Run browser automation and webscraping",
  // },
  ticketmaster: {
    id: "ticketmaster",
    name: "Ticketmaster",
    summary: "Manage ticket sales and event management",
  },
  // figma: {
  //   id: "figma",
  //   name: "Figma",
  //   summary: "Collaborative design and prototyping",
  // },
  context7: {
    id: "context7",
    name: "Context7",
    summary: "Up-to-date code docs for any prompt",
  },
} as const
