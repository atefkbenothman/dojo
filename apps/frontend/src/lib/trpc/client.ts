import { env } from "@/env"
import { type AppRouter } from "@dojo/api"
import { createTRPCClient, httpBatchLink } from "@trpc/client"

export const serverTrpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${env.BACKEND_URL}/trpc`,
    }),
  ],
})
