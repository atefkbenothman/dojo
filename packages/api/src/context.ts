import { type CreateExpressContextOptions } from "@trpc/server/adapters/express"

/**
 * Creates context for an incoming request.
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = ({ req, res }: CreateExpressContextOptions) => {
  // For now, we're just passing the Express req and res objects.
  // Later, you could add things like user session data here if needed by your procedures.
  return {
    req,
    res,
    // Example: if you had user authentication middleware that populated req.user
    // user: req.user,
  }
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>
