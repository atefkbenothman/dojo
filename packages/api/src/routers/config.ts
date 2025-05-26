import { router, publicProcedure } from "../trpc.js"
import { AI_MODELS, CONFIGURED_MCP_SERVERS, CONFIGURED_AGENTS } from "@dojo/config"

export const configRouter = router({
  get: publicProcedure.query(() => {
    return {
      aiModels: AI_MODELS,
      mcpServers: CONFIGURED_MCP_SERVERS,
      agents: CONFIGURED_AGENTS,
    }
  }),
})
