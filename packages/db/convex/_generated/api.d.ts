/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */
import type * as agentExecutions from "../agentExecutions.js"
import type * as agentGenerationExecutions from "../agentGenerationExecutions.js"
import type * as agents from "../agents.js"
import type * as apiKeys from "../apiKeys.js"
import type * as auth from "../auth.js"
import type * as crons from "../crons.js"
import type * as generation from "../generation.js"
import type * as http from "../http.js"
import type * as mcp from "../mcp.js"
import type * as mcpConnections from "../mcpConnections.js"
import type * as models from "../models.js"
import type * as sessions from "../sessions.js"
import type * as types from "../types.js"
import type * as user from "../user.js"
import type * as workflowExecutions from "../workflowExecutions.js"
import type * as workflowGenerationExecutions from "../workflowGenerationExecutions.js"
import type * as workflows from "../workflows.js"
import type { ApiFromModules, FilterApi, FunctionReference } from "convex/server"

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  agentExecutions: typeof agentExecutions
  agentGenerationExecutions: typeof agentGenerationExecutions
  agents: typeof agents
  apiKeys: typeof apiKeys
  auth: typeof auth
  crons: typeof crons
  generation: typeof generation
  http: typeof http
  mcp: typeof mcp
  mcpConnections: typeof mcpConnections
  models: typeof models
  sessions: typeof sessions
  types: typeof types
  user: typeof user
  workflowExecutions: typeof workflowExecutions
  workflowGenerationExecutions: typeof workflowGenerationExecutions
  workflows: typeof workflows
}>
export declare const api: FilterApi<typeof fullApi, FunctionReference<any, "public">>
export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, "internal">>
