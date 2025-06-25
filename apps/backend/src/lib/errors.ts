import { logger } from "./logger"
import type { Request, Response, NextFunction } from "express"

// Extend Error to include statusCode
declare global {
  interface Error {
    statusCode?: number
  }
}

/**
 * Simple error thrower with HTTP status codes
 */
export function throwError(message: string, statusCode = 500): never {
  const error = new Error(message)
  error.statusCode = statusCode
  throw error
}

/**
 * Simple error handling middleware
 */
export function errorHandlerMiddleware(error: Error, req: Request, res: Response, next: NextFunction): void {
  // If response already sent, delegate to Express default handler
  if (res.headersSent) {
    next(error)
    return
  }

  const statusCode = error.statusCode || 500

  // Log the error
  logger.error("HTTP", `${req.method} ${req.path} - ${error.message}`, error)

  // Send simple error response
  res.status(statusCode).json({ error: error.message })
}

/**
 * Async wrapper for route handlers to catch errors
 */
export function asyncHandler<T extends Request = Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: T, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
