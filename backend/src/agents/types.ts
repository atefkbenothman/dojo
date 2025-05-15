import { type CoreMessage, type LanguageModel, type ToolSet } from "ai"
import { type Response as ExpressResponse } from "express"

// Input structure for an agent
export interface AgentInput<TPreviousResult = any> {
  messages: CoreMessage[]
  languageModel: LanguageModel
  tools?: ToolSet
  previousAgentResult?: TPreviousResult // Output from the preceding agent
  // Add any other contextual data agents might need
}

// Output structure that an agent's execute method returns to the orchestrator (server-side)
// This is distinct from what it streams to the client via the ExpressResponse.
export interface AgentInternalOutput<TResult = any> {
  result: TResult // The primary result of the agent's execution for server-side use
  // Add metadata useful for subsequent agents or server logic
}

// The core Agent interface
export interface IAgent<TInputParams = any, TOutputResult = any> {
  name: string
  description: string

  /**
   * Executes the agent's core logic.
   * Streams output to the client via the ExpressResponse object.
   * Returns an internal result for use by the orchestrator or subsequent agents.
   */
  execute(input: AgentInput<TInputParams>, res: ExpressResponse): Promise<AgentInternalOutput<TOutputResult>>
}
