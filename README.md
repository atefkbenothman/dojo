# Dojo

Build, Run, and Chain Custom Tool-Augmented LLM Agents.

<img width="1552" alt="Screenshot 2025-05-23 at 10 52 20 PM" src="https://github.com/user-attachments/assets/db824d86-1d64-40fb-9d5f-b0262e316e3e" />

## What is Dojo?

Dojo is your local AI workbench for building, chaining, and running custom tool-augmented LLM agents. It enables you to design sophisticated, multi-agent workflows to automate complex tasks by combining LLMs and specialized tools—all within your local environment.

## Key Capabilities

- **Build & Chain Custom Agents:** Define agents by selecting an LLM, crafting a system prompt (its goal/persona), and assigning it specific tools. Orchestrate sequences of these custom agents.
- **Dynamic Tool Integration (MCP):** Equip your agents (or use directly in chat) with _any_ command-line tool by defining how it's launched (command, arguments, environment).
- **Interactive LLM Chat:** Direct conversational access to LLMs, also capable of using your configured tools.
- **Local & Extensible:** Ensures privacy and allows deep customization of agents and tools.

## Tech Stack & Architecture

Dojo is a Turborepo-managed monorepo with a distinct frontend, backend, and shared packages:

- **`apps/frontend` (Next.js 15, React 19, TypeScript):** The UI for all user interactions:
  - Defining, configuring, and chaining custom AI agents (LLM, system prompt, tools).
  - Managing tool (MCP Server) configurations (command, arguments, environment).
  - Interactive chat with LLMs and their connected tools.
- **`apps/backend` (Node.js, Express.js, TypeScript):** The orchestration engine:
  - Manages external tool (MCP Server) lifecycles via Vercel AI SDK's Stdio mechanism.
  - Executes AI agent logic (single and chained).
  - Handles direct chat and LLM tool usage.
- **`packages/*`:** Shared utilities (`@dojo/utils`), ESLint (`@dojo/eslint`), and TypeScript (`@dojo/tsconfig`) configurations.

**Key Technologies:**

- **AI/LLM:** Vercel AI SDK (with `@ai-sdk/google`, `@ai-sdk/groq`, `@ai-sdk/openai` integrations)
- **Frontend:** Next.js (App Router), React 19, TypeScript, Tailwind CSS, Shadcn UI, Radix UI
- **Backend:** Node.js, Express.js (v5), TypeScript, Zod
- **Monorepo & Tooling:** Turborepo, ESLint, Prettier
- **Key Services:** Chokidar (backend file monitoring)
