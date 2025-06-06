"use client"

import { env } from "@/env"
import { useUserContext } from "@/hooks/use-user-id"
import { TRPCProvider } from "@/lib/trpc/context"
import { type AppRouter } from "@dojo/backend/src/trpc/router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { httpBatchLink } from "@trpc/client"
import { createTRPCClient } from "@trpc/client"
import { useState } from "react"

export function DojoTRPCProvider({ children }: { children: React.ReactNode }) {
  const { userId } = useUserContext()

  const [queryClient] = useState(() => new QueryClient())

  const [trpcClientInstance] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          url: `${env.NEXT_PUBLIC_BACKEND_URL}/trpc`,
          async headers() {
            const headers: Record<string, string> = {}
            if (userId) {
              headers["X-User-Id"] = userId
            }
            return headers
          },
        }),
      ],
    }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClientInstance} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  )
}
