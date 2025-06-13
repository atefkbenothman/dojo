"use client"

import { useLocalStorage } from "@/hooks/use-local-storage"
import { GUEST_SESSION_KEY } from "@/lib/constants"
import { TRPCProvider } from "@/lib/trpc/context"
import { useAuthToken } from "@convex-dev/auth/react"
import { type AppRouter } from "@dojo/backend/src/trpc/router"
import { env } from "@dojo/env/frontend"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { httpBatchLink } from "@trpc/client"
import { createTRPCClient } from "@trpc/client"
import { useMemo, useState } from "react"

export function DojoTRPCProvider({ children }: { children: React.ReactNode }) {
  const authToken = useAuthToken()
  const [queryClient] = useState(() => new QueryClient())
  const { readStorage } = useLocalStorage()

  const trpcClientInstance = useMemo(
    () =>
      createTRPCClient<AppRouter>({
        links: [
          httpBatchLink({
            url: `${env.NEXT_PUBLIC_BACKEND_URL}/trpc`,
            async headers() {
              // This is the client-side provider, so it runs in the browser.
              // First, try to get a real auth token for a logged-in user.
              if (authToken) {
                return {
                  Authorization: `Bearer ${authToken}`,
                }
              }

              // If no auth token, check for a guest session ID in local storage.
              const guestSessionId = readStorage<string>(GUEST_SESSION_KEY)
              if (guestSessionId) {
                return {
                  "x-guest-session-id": guestSessionId,
                }
              }

              // If neither is found, send no session headers.
              return {}
            },
          }),
        ],
      }),
    [authToken, readStorage],
  )

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClientInstance} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  )
}
