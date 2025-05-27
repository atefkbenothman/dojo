import { type AppRouter } from "@dojo/backend/src/trpc/router"
import { createTRPCContext } from "@trpc/tanstack-react-query"

export const { TRPCProvider, useTRPC, useTRPCClient } = createTRPCContext<AppRouter>()
