import { create } from "zustand"

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error"

export interface ActiveConnection {
  serverId: string
  name: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools: Record<any, any>
}

interface ConnectionMeta {
  status: ConnectionStatus
  error: string | null
  name: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools: Record<any, any>
}

interface MCPState {
  connectionMeta: Record<string, ConnectionMeta>
  setConnectionStatus: (serverId: string, status: ConnectionStatus) => void
  setConnectionError: (serverId: string, error: string | null) => void
  setConnectionMeta: (serverId: string, meta: Partial<ConnectionMeta>) => void
}

const defaultMeta: ConnectionMeta = {
  status: "disconnected",
  error: null,
  name: "",
  tools: {},
}

export const useMCPStore = create<MCPState>((set) => ({
  connectionMeta: {},
  setConnectionStatus: (serverId, status) =>
    set((state) => {
      const prev = state.connectionMeta[serverId] || defaultMeta
      return {
        connectionMeta: {
          ...state.connectionMeta,
          [serverId]: {
            ...prev,
            status,
          },
        },
      }
    }),
  setConnectionError: (serverId, error) =>
    set((state) => {
      const prev = state.connectionMeta[serverId] || defaultMeta
      return {
        connectionMeta: {
          ...state.connectionMeta,
          [serverId]: {
            ...prev,
            error,
          },
        },
      }
    }),
  setConnectionMeta: (serverId, meta) =>
    set((state) => {
      const prev = state.connectionMeta[serverId] || defaultMeta
      return {
        connectionMeta: {
          ...state.connectionMeta,
          [serverId]: {
            ...prev,
            ...meta,
          },
        },
      }
    }),
}))
