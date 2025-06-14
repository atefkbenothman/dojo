import { create } from "zustand"

export type AgentStatus = "idle" | "preparing" | "running" | "error"

export interface AgentMeta {
  status: AgentStatus
  error: string | null
  progress: string | null
  lastRunAt: number | null
}

interface AgentState {
  agentMeta: Record<string, AgentMeta>
  setAgentStatus: (agentId: string, status: AgentStatus) => void
  setAgentError: (agentId: string, error: string | null) => void
  setAgentProgress: (agentId: string, progress: string | null) => void
  setAgentMeta: (agentId: string, meta: Partial<AgentMeta>) => void
  clearAgentMeta: (agentId: string) => void
  clearAllAgentMeta: () => void
  getAgentStatus: (agentId: string) => AgentStatus
  getAgentError: (agentId: string) => string | null
  getAgentProgress: (agentId: string) => string | null
  getRunningAgents: () => string[]
}

const defaultMeta: AgentMeta = {
  status: "idle",
  error: null,
  progress: null,
  lastRunAt: null,
}

export const useAgentStore = create<AgentState>((set, get) => ({
  agentMeta: {},
  setAgentStatus: (agentId, status) =>
    set((state) => {
      const prev = state.agentMeta[agentId] || defaultMeta
      return {
        agentMeta: {
          ...state.agentMeta,
          [agentId]: {
            ...prev,
            status,
            lastRunAt: status === "preparing" ? Date.now() : prev.lastRunAt,
          },
        },
      }
    }),
  setAgentError: (agentId, error) =>
    set((state) => {
      const prev = state.agentMeta[agentId] || defaultMeta
      return {
        agentMeta: {
          ...state.agentMeta,
          [agentId]: {
            ...prev,
            error,
          },
        },
      }
    }),
  setAgentProgress: (agentId, progress) =>
    set((state) => {
      const prev = state.agentMeta[agentId] || defaultMeta
      return {
        agentMeta: {
          ...state.agentMeta,
          [agentId]: {
            ...prev,
            progress,
          },
        },
      }
    }),
  setAgentMeta: (agentId, meta) =>
    set((state) => {
      const prev = state.agentMeta[agentId] || defaultMeta
      return {
        agentMeta: {
          ...state.agentMeta,
          [agentId]: {
            ...prev,
            ...meta,
          },
        },
      }
    }),
  clearAgentMeta: (agentId) =>
    set((state) => {
      const { [agentId]: _, ...rest } = state.agentMeta
      return {
        agentMeta: rest,
      }
    }),
  clearAllAgentMeta: () =>
    set(() => ({
      agentMeta: {},
    })),
  getAgentStatus: (agentId) => {
    const state = get()
    return state.agentMeta[agentId]?.status || "idle"
  },
  getAgentError: (agentId) => {
    const state = get()
    return state.agentMeta[agentId]?.error || null
  },
  getAgentProgress: (agentId) => {
    const state = get()
    return state.agentMeta[agentId]?.progress || null
  },
  getRunningAgents: () => {
    const state = get()
    return Object.entries(state.agentMeta)
      .filter(([_, meta]) => meta.status === "preparing" || meta.status === "running")
      .map(([agentId]) => agentId)
  },
}))
