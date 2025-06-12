import { env } from "@/env"
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server"
import { type AppRouter } from "@dojo/backend/src/trpc/router"
import { createTRPCClient, httpBatchLink } from "@trpc/client"

export const serverTrpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${env.BACKEND_URL}/trpc`,
      async headers() {
        const headers: Record<string, string> = {}
        // This client is used on the server, so we use the server-side token helper.
        const token = await convexAuthNextjsToken()
        if (token) {
          headers["authorization"] = `Bearer ${token}`
        }
        return headers
      },
    }),
  ],
})
