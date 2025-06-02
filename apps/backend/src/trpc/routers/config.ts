import { router, publicProcedure } from "../trpc.js"
import { AGENT_CONFIGS, AI_MODELS, CONFIGURED_MCP_SERVERS, AGENT_WORKFLOWS } from "@dojo/config"

export const configRouter = router({
  get: publicProcedure.query(() => {
    return {
      aiModels: AI_MODELS,
      mcpServers: CONFIGURED_MCP_SERVERS,
      agents: AGENT_CONFIGS,
      workflows: AGENT_WORKFLOWS,
    }
  }),
})
