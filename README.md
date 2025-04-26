# Dojo

A local web-based chat interface that enables interaction with Large Language Models (LLMs) connected to various external tools and services via the Model Context Protocol (MCP).

<img width="1552" alt="Screenshot 2025-04-18 at 9 26 48 PM" src="https://github.com/user-attachments/assets/4a9fe38a-90a5-4916-b6e9-daf4828086b1" />

## Features

- Chat interface for interacting with LLMs
- Connect to external services (GitHub, Supabase, Filesystem, etc.) via MCP
- Support for streaming responses and multi-step tool calls
- User-defined configurations for MCP server connections
- Local development environment

## Architecture

Dojo consists of two main components:

- **Frontend**: Next.js application handling the UI and conversation state
- **Backend**: Node.js/Express service managing MCP connections and AI interactions

## Getting Started

1. Clone the repository
2. Set up environment variables in `mcp-service/.env`
3. Install dependencies and start both services

## License

MIT
