/**
 * Simple structured logger for consistent console output
 */
export const logger = {
  /**
   * Info logs - shown in all environments
   * Use for: API calls, MCP connections, server lifecycle, workflow progress
   */
  info: (service: string, message: string, data?: unknown) => {
    if (data !== undefined) {
      console.log(`[${service}] ${message}`, data)
    } else {
      console.log(`[${service}] ${message}`)
    }
  },

  /**
   * Error logs - shown in all environments
   * Use for: All errors and failures
   */
  error: (service: string, message: string, error?: unknown) => {
    if (error) {
      console.error(`[${service}] ${message}`, error)
    } else {
      console.error(`[${service}] ${message}`)
    }
  },

  /**
   * Debug logs - only shown in development
   * Use for: Performance timing, verbose model management, detailed debugging
   */
  debug: (service: string, message: string, data?: unknown) => {
    if (process.env.NODE_ENV !== "production") {
      if (data !== undefined) {
        console.log(`[${service}] ${message}`, data)
      } else {
        console.log(`[${service}] ${message}`)
      }
    }
  },
}
