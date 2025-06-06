import { create } from "zustand"

export type BackendHealthStatus = "unknown" | "healthy" | "unhealthy"

interface BackendStoreState {
  status: BackendHealthStatus
  lastChecked: number | null
  error: string | null
  setHealth: (status: BackendHealthStatus, error?: string | null) => void
}

export const useBackendStore = create<BackendStoreState>((set) => ({
  status: "unknown",
  lastChecked: null,
  error: null,
  setHealth: (status, error = null) =>
    set({
      status,
      lastChecked: Date.now(),
      error,
    }),
}))
