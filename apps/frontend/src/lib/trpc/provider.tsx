"use client"

import { env } from "@/env"
import { TRPCProvider } from "@/lib/trpc/context"
import { type AppRouter } from "@dojo/api"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { httpBatchLink } from "@trpc/client"
import { createTRPCClient } from "@trpc/client"
import { useState } from "react"

export function DojoTRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  const [trpcClientInstance] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        // loggerLink({
        //   enabled: (opts) =>
        //     process.env.NODE_ENV === "development" || (opts.direction === "down" && opts.result instanceof Error),
        // }),
        httpBatchLink({
          url: `${env.NEXT_PUBLIC_BACKEND_URL}/trpc`,
          async headers() {
            return {}
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
