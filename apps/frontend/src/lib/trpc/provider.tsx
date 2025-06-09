"use client"

import { env } from "@/env"
import { TRPCProvider } from "@/lib/trpc/context"
import { useAuthToken } from "@convex-dev/auth/react"
import { type AppRouter } from "@dojo/backend/src/trpc/router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { httpBatchLink } from "@trpc/client"
import { createTRPCClient } from "@trpc/client"
import { useMemo, useState } from "react"

export function DojoTRPCProvider({ children }: { children: React.ReactNode }) {
  const authToken = useAuthToken()
  const [queryClient] = useState(() => new QueryClient())

  const trpcClientInstance = useMemo(
    () =>
      createTRPCClient<AppRouter>({
        links: [
          httpBatchLink({
            url: `${env.NEXT_PUBLIC_BACKEND_URL}/trpc`,
            async headers() {
              if (authToken) {
                return {
                  Authorization: `Bearer ${authToken}`,
                }
              }
              return {}
            },
          }),
        ],
      }),
    [authToken],
  )

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClientInstance} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  )
}
