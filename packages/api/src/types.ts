import type { AppRouter } from "./router.js"
import type { inferRouterOutputs } from "@trpc/server"

export type RouterOutputs = inferRouterOutputs<AppRouter>

export type ConfigGetOutput = RouterOutputs["config"]["get"]
