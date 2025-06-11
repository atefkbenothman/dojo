import { Id } from "@dojo/db/convex/_generated/dataModel"
import { create } from "zustand"

interface SessionState {
  guestSessionId: Id<"sessions"> | null
  setGuestSessionId: (id: Id<"sessions"> | null) => void
}

export const useSessionStore = create<SessionState>((set) => ({
  guestSessionId: null,
  setGuestSessionId: (id) => set({ guestSessionId: id }),
}))
