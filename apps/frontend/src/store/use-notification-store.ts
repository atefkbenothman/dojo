import { create } from "zustand"

interface NotificationState {
  hasUnreadMessages: boolean
  unreadContexts: Set<string>
  addUnreadContext: (context: string) => void
  removeUnreadContext: (context: string) => void
  clearAllNotifications: () => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  hasUnreadMessages: false,
  unreadContexts: new Set(),
  addUnreadContext: (context: string) =>
    set((state) => {
      const newUnreadContexts = new Set(state.unreadContexts)
      newUnreadContexts.add(context)
      return {
        unreadContexts: newUnreadContexts,
        hasUnreadMessages: newUnreadContexts.size > 0,
      }
    }),
  removeUnreadContext: (context: string) =>
    set((state) => {
      const newUnreadContexts = new Set(state.unreadContexts)
      newUnreadContexts.delete(context)
      return {
        unreadContexts: newUnreadContexts,
        hasUnreadMessages: newUnreadContexts.size > 0,
      }
    }),
  clearAllNotifications: () =>
    set(() => ({
      unreadContexts: new Set(),
      hasUnreadMessages: false,
    })),
}))