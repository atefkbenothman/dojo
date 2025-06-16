import { create } from "zustand"

// Simple store for MCP tools data
// Tools come from the backend and are too large/dynamic for Convex
interface MCPState {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools: Record<string, Record<any, any>> // serverId -> tools
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setTools: (serverId: string, tools: Record<any, any>) => void
  clearTools: (serverId: string) => void
}

export const useMCPStore = create<MCPState>((set) => ({
  tools: {},
  setTools: (serverId, tools) =>
    set((state) => ({
      tools: {
        ...state.tools,
        [serverId]: tools,
      },
    })),
  clearTools: (serverId) =>
    set((state) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [serverId]: _, ...rest } = state.tools
      return { tools: rest }
    }),
}))
