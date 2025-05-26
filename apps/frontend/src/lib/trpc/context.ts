import { type AppRouter } from "@dojo/api"
import { createTRPCContext } from "@trpc/tanstack-react-query"

/**
 * Initializes the tRPC context for the frontend.
 * This is based on the tRPC v11 setup for Next.js with TanStack Query.
 *
 * @see https://trpc.io/docs/client/tanstack-react-query/setup#3a-setup-the-trpc-context-provider
 */
export const { TRPCProvider, useTRPC, useTRPCClient } = createTRPCContext<AppRouter>()
