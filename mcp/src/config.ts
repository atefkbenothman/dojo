import { wrapLanguageModel, extractReasoningMiddleware } from "ai"
import { createGroq } from "@ai-sdk/groq"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import type { AIModelConfig, MCPServer } from "./types"

export const AVAILABLE_AI_MODELS: Record<string, AIModelConfig> = {
  "gemini-1.5-flash": {
    name: "Google Gemini 1.5 Flash",
    modelName: "gemini-1.5-flash",
    languageModel: wrapLanguageModel({
      model: createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_API_KEY })(
        "gemini-1.5-flash",
      ),
      middleware: extractReasoningMiddleware({ tagName: "think" }),
    }),
  },
  "gemini-2.0-flash-001": {
    name: "Google Gemini 2.0 Flash",
    modelName: "gemini-2.0-flash-001",
    languageModel: wrapLanguageModel({
      model: createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_API_KEY })(
        "gemini-2.0-flash-001",
      ),
      middleware: extractReasoningMiddleware({ tagName: "think" }),
    }),
  },
  "deepseek-r1-distill-llama-70b": {
    name: "Deepseek",
    modelName: "deepseek-r1-distill-llama-70b",
    languageModel: wrapLanguageModel({
      model: createGroq({ apiKey: process.env.GROQ_API_KEY })(
        "deepseek-r1-distill-llama-70b",
      ),
      middleware: extractReasoningMiddleware({ tagName: "think" }),
    }),
  },
}

export const AVAILABLE_MCP_SERVERS: Record<string, MCPServer> = {
  github: {
    id: "github",
    name: "Github",
    summary:
      "Repository management, file operations, and GitHub API integration",
  },
  blender: {
    id: "blender",
    name: "Blender",
    summary:
      "Enable prompt assisted 3D modeling, scene creation, and manipulation",
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
}
