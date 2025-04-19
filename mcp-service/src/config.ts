import { wrapLanguageModel, extractReasoningMiddleware } from "ai"
import { createGroq } from "@ai-sdk/groq"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import type { MCPServerConfig, AIModelConfig } from "./types"

export const AVAILABLE_AI_MODELS: Record<string, AIModelConfig> = {
  "gemini-1.5-flash": {
    name: "Google Gemini 1.5 Flash",
    modelName: "gemini-1.5-flash",
    languageModel: wrapLanguageModel({
      model: createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_API_KEY })("gemini-1.5-flash"),
      middleware: extractReasoningMiddleware({ tagName: "think" })
    })
  },
  "gemini-2.0-flash-001": {
    name: "Google Gemini 2.0 Flash",
    modelName: "gemini-2.0-flash-001",
    languageModel: wrapLanguageModel({
      model: createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_API_KEY })("gemini-2.0-flash-001"),
      middleware: extractReasoningMiddleware({ tagName: "think" })
    })
  },
  "deepseek-r1-distill-llama-70b": {
    name: "Deepseek",
    modelName: "deepseek-r1-distill-llama-70b",
    languageModel: wrapLanguageModel({
      model: createGroq({ apiKey: process.env.GROQ_API_KEY })("deepseek-r1-distill-llama-70b"),
      middleware: extractReasoningMiddleware({ tagName: "think" })
    })
  }
}

export const AVAILABLE_MCP_SERVERS: Record<string, MCPServerConfig> = {
  "github": {
    id: "github",
    displayName: "Github",
    command: "docker-compose",
    args: ["run", "--rm", "github-mcp-server"],
    cwd: "../",
    summary: "Repository management, file operations, and GitHub API integration",
  },
  "blender": {
    id: "blender",
    displayName: "Blender",
    command: "uvx",
    args: ["blender-mcp"],
    cwd: "../",
    summary: "Enable prompt assisted 3D modeling, scene creation, and manipulation",
  },
  "supabase": {
    id: "supabase",
    displayName: "Supabase",
    command: "npx",
    args: [
      "-y",
      "@supabase/mcp-server-supabase@latest",
      "--access-token",
      process.env.SUPABASE_ACCESS_TOKEN || ""
    ],
    summary: "Connect directly to the cloud platform to access your database",
  },
  "filesystem": {
    id: "filesystem",
    displayName: "Filesystem",
    command: "npx",
    args: [
      "-y",
      "@modelcontextprotocol/server-filesystem",
    ],
    userArgs: true,
    summary: "Secure file operations with configurable access controls",
  },
  "playwright": {
    id: "playwright",
    displayName: "Playwright",
    command: "npx",
    args: [
      "-y",
      "@playwright/mcp@latest",
      "--browser",
      "chrome",
    ],
    summary: "Run browser automation and webscraping"
  },
  "ticketmaster": {
    id: "ticketmaster",
    displayName: "Ticketmaster",
    command: "npx",
    args: [
      "-y",
      "@delorenj/mcp-server-ticketmaster",
    ],
    env: {
      "TICKETMASTER_API_KEY": process.env.TICKETMASTER_API_KEY || "",
    },
    summary: "Search for events, venues, and attractions through the Ticketmaster Discovery API"
  }
}
